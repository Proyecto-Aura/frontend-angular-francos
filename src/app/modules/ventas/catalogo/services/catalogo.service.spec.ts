import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ResultadoGuardado, formDesdeProducto } from '../interfaces/producto.interface';
import {
  API,
  archivoImagen,
  catalogoDto,
  flushCatalogo,
  makeFormValido,
  makeFilaDto,
  makePresentacion,
  makeProducto,
  page,
} from '../testing/catalogo.fixtures';
import { CatalogoService } from './catalogo.service';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function cargarCatalogo(): void {
    service.cargar();
    flushCatalogo(httpMock);
  }

  describe('carga', () => {
    it('does not call the API until asked to load', () => {
      expect(service.productos()).toEqual([]);
      expect(service.cargando()).toBe(false);
    });

    it('loads rows, categories and presentation options from the API', () => {
      service.cargar();
      expect(service.cargando()).toBe(true);

      flushCatalogo(httpMock);

      expect(service.cargando()).toBe(false);
      expect(service.errorCarga()).toBe(false);
      expect(service.filas()).toHaveLength(9);
      expect(service.productos()).toHaveLength(7);
      expect(service.categoriaOpciones()).toHaveLength(5);
      expect(service.presentacionOpciones().map((o) => o.nombre)).toContain('1 kg');
    });

    it('lists the category names for the filter', () => {
      cargarCatalogo();

      expect(service.categorias()).toEqual([
        'Chifles',
        'Camote',
        'Snacks andinos',
        'Frutos secos',
        'Temporada',
      ]);
    });

    it('requests the remaining pages when the API paginates', () => {
      service.cargar();

      const [primera, segunda] = [catalogoDto().slice(0, 5), catalogoDto().slice(5)];
      httpMock
        .expectOne((r) => r.url === API.productoPresentaciones && r.params.get('page') === '1')
        .flush(page(primera, 1, 2));
      httpMock
        .expectOne((r) => r.url === API.productoPresentaciones && r.params.get('page') === '2')
        .flush(page(segunda, 2, 2));
      httpMock.expectOne((r) => r.url === API.categorias).flush(page([]));
      httpMock.expectOne((r) => r.url === API.presentaciones).flush(page([]));

      expect(service.filas()).toHaveLength(9);
    });

    it('flags an error and clears the catalog when loading fails', () => {
      service.cargar();

      httpMock
        .expectOne((r) => r.url === API.productoPresentaciones)
        .flush({ message: 'boom' }, { status: 500, statusText: 'Error' });
      // forkJoin cancela las demás peticiones en cuanto una falla.
      httpMock.match(() => true);

      expect(service.errorCarga()).toBe(true);
      expect(service.cargando()).toBe(false);
      expect(service.productos()).toEqual([]);
    });
  });

  describe('registrar', () => {
    let resultado: ResultadoGuardado | undefined;
    let error: unknown;

    beforeEach(() => {
      resultado = undefined;
      error = undefined;
    });

    const productoCreado = {
      id: 8,
      producto_presentaciones: [{ id: 81, sku: 'FR-P8-PR1', presentacion_id: 1 }],
    };

    it('creates the product with its presentations in one POST and reloads the catalog', () => {
      service.registrar(makeFormValido()).subscribe((r) => (resultado = r));

      const req = httpMock.expectOne(API.productos);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        categoria_id: 1,
        nombre: 'Chifles BBQ',
        descripcion: 'Sabor BBQ.',
        destacado: false,
        producto_presentaciones: [
          { presentacion_id: 1, precio_unitario: 6, precio_mayorista: 5, umbral_mayorista: 12 },
        ],
      });
      req.flush(productoCreado);
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('ok');
      expect(resultado?.mensaje).toContain('Producto registrado · SKU FR-P8-PR1');
      expect(resultado?.mensaje).toContain('visible en Portal B inicia desactivado');
    });

    it('creates the promotion of each presentation that has one', () => {
      const form = makeFormValido();
      form.presentaciones[0] = {
        ...form.presentaciones[0],
        promoActiva: true,
        promoPct: '25',
        promoIni: '2026-10-01',
        promoFin: '2026-10-31',
      };

      service.registrar(form).subscribe((r) => (resultado = r));
      httpMock.expectOne(API.productos).flush(productoCreado);

      const promo = httpMock.expectOne(API.promociones);
      expect(promo.request.method).toBe('POST');
      expect(promo.request.body).toEqual({
        producto_presentacion_id: 81,
        valor: 25,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-10-31',
      });
      promo.flush({ id: 5 });
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('ok');
    });

    it('uploads the chosen image of each new presentation as a file', () => {
      const archivo = archivoImagen('chifles.png');
      const form = makeFormValido();
      form.presentaciones[0] = { ...form.presentaciones[0], imagenArchivo: archivo };

      service.registrar(form).subscribe((r) => (resultado = r));
      httpMock.expectOne(API.productos).flush(productoCreado);

      const imagen = httpMock.expectOne(`${API.productoPresentaciones}/81/imagen`);
      expect(imagen.request.method).toBe('POST');
      expect(imagen.request.body).toBeInstanceOf(FormData);
      expect((imagen.request.body as FormData).get('imagen')).toBe(archivo);
      imagen.flush({ id: 81, imagen_url: 'http://localhost:9000/francos-media/productos/a.png' });
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('ok');
    });

    it('does not upload anything when no image was chosen', () => {
      service.registrar(makeFormValido()).subscribe((r) => (resultado = r));
      httpMock.expectOne(API.productos).flush(productoCreado);
      flushCatalogo(httpMock);

      httpMock.expectNone(`${API.productoPresentaciones}/81/imagen`);
      expect(resultado?.tono).toBe('ok');
    });

    it('reports a rejected image without failing the registration', () => {
      const form = makeFormValido();
      form.presentaciones[0] = { ...form.presentaciones[0], imagenArchivo: archivoImagen() };

      service.registrar(form).subscribe((r) => (resultado = r));
      httpMock.expectOne(API.productos).flush(productoCreado);
      httpMock
        .expectOne(`${API.productoPresentaciones}/81/imagen`)
        .flush(
          { statusCode: 400, message: 'Validation failed (current file type is image/gif)' },
          { status: 400, statusText: 'Bad Request' },
        );
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('error');
      expect(resultado?.mensaje).toContain('Producto registrado (SKU FR-P8-PR1)');
      expect(resultado?.mensaje).toContain('la imagen de la presentación');
    });

    it('reports a failed promotion without failing the registration', () => {
      const form = makeFormValido();
      form.presentaciones[0] = {
        ...form.presentaciones[0],
        promoActiva: true,
        promoPct: '25',
        promoIni: '2026-10-01',
        promoFin: '2026-10-31',
      };

      service.registrar(form).subscribe((r) => (resultado = r));
      httpMock.expectOne(API.productos).flush(productoCreado);
      httpMock
        .expectOne(API.promociones)
        .flush(
          { statusCode: 409, message: 'Ya existe una promoción activa que se cruza' },
          { status: 409, statusText: 'Conflict' },
        );
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('error');
      expect(resultado?.mensaje).toContain('Producto registrado (SKU FR-P8-PR1)');
      expect(resultado?.mensaje).toContain('Ya existe una promoción activa que se cruza');
    });

    it('fails, and creates no promotions, when the product itself cannot be created', () => {
      const form = makeFormValido();
      form.presentaciones[0] = { ...form.presentaciones[0], promoActiva: true };

      service.registrar(form).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(API.productos)
        .flush(
          { statusCode: 409, message: 'Ya existe un producto registrado con ese nombre' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(error).toBeDefined();
      httpMock.expectNone(API.promociones);
    });
  });

  describe('actualizar', () => {
    let resultado: ResultadoGuardado | undefined;
    let error: unknown;

    beforeEach(() => {
      resultado = undefined;
      error = undefined;
    });

    it('updates the product and each existing presentation, then reloads', () => {
      const form = formDesdeProducto(makeProducto());
      form.nombre = 'Chifles clásicos XL';
      form.presentaciones[0].precioUnit = '6.5';

      service.actualizar(1, form).subscribe((r) => (resultado = r));

      const producto = httpMock.expectOne(`${API.productos}/1`);
      expect(producto.request.method).toBe('PATCH');
      expect(producto.request.body).toEqual({
        categoria_id: 1,
        nombre: 'Chifles clásicos XL',
        descripcion: 'Plátano bellaco en hojuelas.',
        destacado: true,
      });
      producto.flush({});

      const presentacion = httpMock.expectOne(`${API.productoPresentaciones}/11`);
      expect(presentacion.request.method).toBe('PATCH');
      expect(presentacion.request.body).toEqual({
        precio_unitario: 6.5,
        precio_mayorista: 4.2,
        umbral_mayorista: 24,
      });
      presentacion.flush({});
      flushCatalogo(httpMock);

      expect(resultado).toEqual({
        tono: 'ok',
        mensaje: 'Producto actualizado · el SKU y el slug se mantienen sin cambios.',
      });
    });

    it('uploads the new image of an existing presentation after saving it', () => {
      const archivo = archivoImagen('nueva.webp', 'image/webp');
      const form = formDesdeProducto(makeProducto());
      form.presentaciones[0].imagenArchivo = archivo;

      service.actualizar(1, form).subscribe((r) => (resultado = r));
      httpMock.expectOne(`${API.productos}/1`).flush({});
      httpMock.expectOne(`${API.productoPresentaciones}/11`).flush({});

      const imagen = httpMock.expectOne(`${API.productoPresentaciones}/11/imagen`);
      expect(imagen.request.method).toBe('POST');
      expect((imagen.request.body as FormData).get('imagen')).toBe(archivo);
      imagen.flush({});
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('ok');
    });

    it('keeps the current image when no new file is chosen', () => {
      const form = formDesdeProducto(makeProducto());

      service.actualizar(1, form).subscribe((r) => (resultado = r));
      httpMock.expectOne(`${API.productos}/1`).flush({});
      httpMock.expectOne(`${API.productoPresentaciones}/11`).flush({});
      flushCatalogo(httpMock);

      httpMock.expectNone(`${API.productoPresentaciones}/11/imagen`);
    });

    it('adds the new presentations to the product', () => {
      const form = formDesdeProducto(makeProducto());
      form.presentaciones.push({
        ...makeFormValido().presentaciones[0],
        presentacionId: '2',
        precioUnit: '9.9',
        precioMayor: '7.9',
        umbral: '12',
      });

      service.actualizar(1, form).subscribe((r) => (resultado = r));
      httpMock.expectOne(`${API.productos}/1`).flush({});
      httpMock.expectOne(`${API.productoPresentaciones}/11`).flush({});

      const nueva = httpMock.expectOne(API.productoPresentaciones);
      expect(nueva.request.method).toBe('POST');
      expect(nueva.request.body).toMatchObject({
        producto_id: 1,
        presentacion_id: 2,
        precio_unitario: 9.9,
      });
      nueva.flush({ id: 12 });
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('ok');
    });

    it('creates, edits and deactivates promotions according to the form', () => {
      const form = formDesdeProducto(
        makeProducto({
          presentaciones: [
            makePresentacion({
              promo: { id: 91, pct: 10, ini: '2026-09-01', fin: '2026-09-30' },
            }),
            makePresentacion({
              id: 2,
              productoPresentacionId: 12,
              sku: 'FR-P1-PR2',
              nombre: '200 gr',
              promo: { id: 92, pct: 15, ini: '2026-09-10', fin: '2026-09-30' },
            }),
            makePresentacion({
              id: 3,
              productoPresentacionId: 13,
              sku: 'FR-P1-PR3',
              nombre: '120 gr',
            }),
          ],
        }),
      );
      form.presentaciones[0].promoPct = '20'; // edita la promoción 91
      form.presentaciones[1].promoActiva = false; // desactiva la promoción 92
      form.presentaciones[2] = {
        ...form.presentaciones[2],
        promoActiva: true,
        promoPct: '30',
        promoIni: '2026-11-01',
        promoFin: '2026-11-30',
      }; // crea una promoción nueva

      service.actualizar(1, form).subscribe((r) => (resultado = r));
      httpMock.expectOne(`${API.productos}/1`).flush({});

      httpMock.expectOne(`${API.productoPresentaciones}/11`).flush({});
      const editar = httpMock.expectOne(`${API.promociones}/91`);
      expect(editar.request.method).toBe('PATCH');
      expect(editar.request.body).toEqual({
        valor: 20,
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-09-30',
      });
      editar.flush({});

      httpMock.expectOne(`${API.productoPresentaciones}/12`).flush({});
      const desactivar = httpMock.expectOne(`${API.promociones}/92`);
      expect(desactivar.request.method).toBe('DELETE');
      desactivar.flush({});

      httpMock.expectOne(`${API.productoPresentaciones}/13`).flush({});
      const crear = httpMock.expectOne(API.promociones);
      expect(crear.request.method).toBe('POST');
      expect(crear.request.body).toEqual({
        producto_presentacion_id: 13,
        valor: 30,
        fecha_inicio: '2026-11-01',
        fecha_fin: '2026-11-30',
      });
      crear.flush({});
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('ok');
    });

    it('stops at the first failing step and reports it', () => {
      const form = formDesdeProducto(
        makeProducto({
          presentaciones: [
            makePresentacion(),
            makePresentacion({
              id: 2,
              productoPresentacionId: 12,
              sku: 'FR-P1-PR2',
              nombre: '200 gr',
            }),
          ],
        }),
      );

      service.actualizar(1, form).subscribe((r) => (resultado = r));
      httpMock.expectOne(`${API.productos}/1`).flush({});
      httpMock.expectOne(`${API.productoPresentaciones}/11`).flush(
        {
          statusCode: 409,
          message: 'El precio mayorista debe ser menor que el precio unitario',
        },
        { status: 409, statusText: 'Conflict' },
      );

      httpMock.expectNone(`${API.productoPresentaciones}/12`);
      flushCatalogo(httpMock);

      expect(resultado?.tono).toBe('error');
      expect(resultado?.mensaje).toContain('Se guardaron los datos del producto');
      expect(resultado?.mensaje).toContain('El precio mayorista debe ser menor');
    });

    it('fails, and touches no presentation, when the product cannot be saved', () => {
      service
        .actualizar(1, formDesdeProducto(makeProducto()))
        .subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${API.productos}/1`)
        .flush(
          { statusCode: 409, message: 'Ya existe otro producto registrado con ese nombre' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(error).toBeDefined();
      httpMock.expectNone(`${API.productoPresentaciones}/11`);
    });
  });

  describe('alternarEstadoPresentacion', () => {
    it('deactivates an active presentation with DELETE and reloads', () => {
      cargarCatalogo();
      let mensaje = '';

      service.alternarEstadoPresentacion(1, 1).subscribe((m) => (mensaje = m));

      const req = httpMock.expectOne(`${API.productoPresentaciones}/11`);
      expect(req.request.method).toBe('DELETE');
      req.flush({});
      flushCatalogo(httpMock);

      expect(mensaje).toBe('Presentación FR-P1-PR1 desactivada de forma lógica.');
    });

    it('reactivates an inactive presentation with PATCH /activate', () => {
      cargarCatalogo();
      let mensaje = '';

      service.alternarEstadoPresentacion(7, 4).subscribe((m) => (mensaje = m));

      const req = httpMock.expectOne(`${API.productoPresentaciones}/71/activate`);
      expect(req.request.method).toBe('PATCH');
      req.flush({});
      flushCatalogo(httpMock);

      expect(mensaje).toBe('Presentación FR-P7-PR4 reactivada.');
    });

    it('propagates the API reason and does not reload when it is rejected', () => {
      cargarCatalogo();
      let error: unknown;

      service.alternarEstadoPresentacion(1, 1).subscribe({ error: (e) => (error = e) });
      httpMock
        .expectOne(`${API.productoPresentaciones}/11`)
        .flush(
          { statusCode: 409, message: 'No se puede desactivar: todavía tiene stock disponible' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(error).toBeDefined();
      httpMock.expectNone((r) => r.url === API.categorias);
    });

    it('fails when the presentation is not in the catalog', () => {
      let error: unknown;

      service.alternarEstadoPresentacion(99, 99).subscribe({ error: (e) => (error = e) });

      expect(error).toBeDefined();
    });
  });

  it('keeps a presentation without stock record as sin stock', () => {
    service.cargar();
    flushCatalogo(httpMock, [
      {
        ...makeFilaDto({
          id: 1,
          productoId: 1,
          nombre: 'Sin stock',
          categoriaId: 1,
          categoria: 'Chifles',
          presentacionId: 1,
          cantidad: 100,
          unidad: 'gr',
          precio: 5,
          mayorista: null,
          umbral: null,
        }),
        producto_terminado: null,
      },
    ]);

    const [fila] = service.filas();
    expect(fila.stock).toBe(0);
    expect(fila.precioMayor).toBe(0);
    expect(fila.umbral).toBe(0);
  });
});
