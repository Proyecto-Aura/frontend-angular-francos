import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  API,
  CATEGORIAS_CFG_DTO,
  PRESENTACIONES_CFG_DTO,
  flushCategoriasCfg,
  flushPresentacionesCfg,
  makePresentacion,
  makeProducto,
} from '../testing/catalogo.fixtures';
import { CatalogoService } from './catalogo.service';
import { ConfiguracionCatalogoService } from './configuracion-catalogo.service';

describe('ConfiguracionCatalogoService', () => {
  let service: ConfiguracionCatalogoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConfiguracionCatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function cargarCategorias() {
    service.cargarCategorias();
    flushCategoriasCfg(httpMock);
  }

  function cargarPresentaciones() {
    service.cargarPresentaciones();
    flushPresentacionesCfg(httpMock);
  }

  describe('cargarPresentaciones', () => {
    it('starts without static presentations', () => {
      expect(service.presentacionesCfg()).toEqual([]);
    });

    it('loads every presentation (active and inactive) named by quantity and unit', () => {
      cargarPresentaciones();

      expect(service.presentacionesCfg()).toHaveLength(4);
      expect(service.presentacionesCfg()[1]).toEqual({
        id: 2,
        nombre: '250 gr',
        descripcion: 'Bolsa de 250 gramos.',
        estado: 'Activo',
        cantidad: 250,
        unidad: 'gr',
      });
      expect(service.presentacionesCfg()[3].estado).toBe('Inactivo');
      expect(service.errorPresentaciones()).toBe(false);
      expect(service.cargandoPresentaciones()).toBe(false);
    });

    it('shows an empty description when the API sends null', () => {
      cargarPresentaciones();

      expect(service.presentacionesCfg()[2].descripcion).toBe('');
    });

    it('refreshes the presentation selectors of the product form', () => {
      cargarPresentaciones();

      const opciones = TestBed.inject(CatalogoService).presentacionOpciones();
      expect(opciones).toHaveLength(4);
      expect(opciones[3]).toEqual({ id: 4, nombre: '1 kg', activa: false });
    });

    it('flags the error and keeps the list empty when the API fails', () => {
      service.cargarPresentaciones();
      expect(service.cargandoPresentaciones()).toBe(true);
      httpMock
        .expectOne((r) => r.url === API.presentaciones)
        .flush({ message: 'x' }, { status: 500, statusText: 'Error' });

      expect(service.errorPresentaciones()).toBe(true);
      expect(service.presentacionesCfg()).toEqual([]);
      expect(service.cargandoPresentaciones()).toBe(false);
    });
  });

  describe('validarCfg de presentaciones', () => {
    beforeEach(cargarPresentaciones);

    const form = (cantidad: string, unidad: string, descripcion = 'Bolsa.') => ({
      nombre: '',
      descripcion,
      cantidad,
      unidad,
    });

    it('accepts a new quantity and unit with a description', () => {
      expect(service.validarCfg('presentaciones', null, form('750', 'gr'))).toEqual([]);
    });

    it('requires an integer quantity between 1 and 1,000,000', () => {
      for (const invalida of ['', '0', '-5', '1.5', 'abc', '1000001']) {
        expect(service.validarCfg('presentaciones', null, form(invalida, 'gr'))).toEqual([
          'cantidad (entero entre 1 y 1.000.000)',
        ]);
      }
    });

    it('requires a valid unit and a description', () => {
      expect(service.validarCfg('presentaciones', null, form('750', 'lt', '  '))).toEqual([
        'unidad de medida',
        'descripción',
      ]);
    });

    it('rejects a quantity and unit that already exist', () => {
      expect(service.validarCfg('presentaciones', null, form('250', 'gr'))).toEqual([
        'la presentación ya está registrada',
      ]);
    });

    it('accepts the same quantity with another unit and keeps the record being edited', () => {
      expect(service.validarCfg('presentaciones', null, form('250', 'kg'))).toEqual([]);
      expect(service.validarCfg('presentaciones', 2, form('250', 'gr'))).toEqual([]);
    });
  });

  describe('cargarCategorias', () => {
    it('starts without static categories', () => {
      expect(service.categoriasCfg()).toEqual([]);
    });

    it('loads every category (active and inactive) from the API', () => {
      cargarCategorias();

      expect(service.categoriasCfg()).toHaveLength(7);
      expect(service.categoriasCfg()[0]).toEqual({
        id: 1,
        nombre: 'Chifles',
        descripcion: 'Hojuelas de plátano bellaco.',
        estado: 'Activo',
      });
      expect(service.categoriasCfg()[6].estado).toBe('Inactivo');
      expect(service.errorCategorias()).toBe(false);
      expect(service.cargandoCategorias()).toBe(false);
    });

    it('shows an empty description when the API sends null', () => {
      service.cargarCategorias();
      flushCategoriasCfg(httpMock, [{ id: 1, nombre: 'Chifles', descripcion: null, estado: true }]);

      expect(service.categoriasCfg()[0].descripcion).toBe('');
    });

    it('refreshes the category selectors of the product form', () => {
      cargarCategorias();

      const opciones = TestBed.inject(CatalogoService).categoriaOpciones();
      expect(opciones).toHaveLength(7);
      expect(opciones[6]).toEqual({ id: 7, nombre: 'Temporada', activa: false });
    });

    it('flags the error and keeps the list empty when the API fails', () => {
      service.cargarCategorias();
      expect(service.cargandoCategorias()).toBe(true);
      httpMock
        .expectOne((r) => r.url === API.categorias)
        .flush({ message: 'x' }, { status: 500, statusText: 'Error' });

      expect(service.errorCategorias()).toBe(true);
      expect(service.categoriasCfg()).toEqual([]);
      expect(service.cargandoCategorias()).toBe(false);
    });
  });

  describe('validarCfg', () => {
    beforeEach(cargarCategorias);

    it('requires name and description for categories', () => {
      expect(service.validarCfg('categorias', null, { nombre: '', descripcion: '' })).toEqual([
        'nombre',
        'descripción',
      ]);
    });

    it('rejects a duplicated name ignoring case', () => {
      const errores = service.validarCfg('categorias', null, {
        nombre: 'chifles',
        descripcion: 'x',
      });

      expect(errores).toEqual(['el nombre ya está registrado']);
    });

    it('allows keeping the name of the record being edited', () => {
      const errores = service.validarCfg('categorias', 1, {
        nombre: 'Chifles',
        descripcion: 'x',
      });

      expect(errores).toEqual([]);
    });
  });

  describe('guardarCfg', () => {
    beforeEach(cargarCategorias);

    it('creates a category through the API and adds it to the list', () => {
      let aviso = '';
      service
        .guardarCfg('categorias', null, { nombre: ' Panadería ', descripcion: 'Productos.' })
        .subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(API.categorias);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ nombre: 'Panadería', descripcion: 'Productos.' });
      req.flush({ id: 8, nombre: 'Panadería', descripcion: 'Productos.', estado: true });

      expect(service.categoriasCfg()).toHaveLength(8);
      expect(service.categoriasCfg()[7]).toEqual({
        id: 8,
        nombre: 'Panadería',
        descripcion: 'Productos.',
        estado: 'Activo',
      });
      expect(aviso).toBe(
        'Categoría Panadería registrada · disponible en los selectores de producto.',
      );
      expect(TestBed.inject(CatalogoService).categoriaOpciones()).toHaveLength(8);
    });

    it('renames a category through the API', () => {
      let aviso = '';
      service
        .guardarCfg('categorias', 1, { nombre: 'Chifles y más', descripcion: 'Nueva.' })
        .subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.categorias}/1`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ id: 1, nombre: 'Chifles y más', descripcion: 'Nueva.', estado: true });

      expect(service.categoriasCfg()[0].nombre).toBe('Chifles y más');
      expect(service.categoriasCfg()).toHaveLength(7);
      expect(aviso).toBe('Categoría Chifles y más actualizada.');
    });

    it('keeps the list and fails when the API rejects the name', () => {
      let error: unknown;
      service
        .guardarCfg('categorias', null, { nombre: 'Chifles', descripcion: 'x' })
        .subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne(API.categorias)
        .flush({ message: 'Ya existe' }, { status: 409, statusText: 'Conflict' });

      expect(error).toBeTruthy();
      expect(service.categoriasCfg()).toHaveLength(7);
    });

    it('creates a presentation through the API and adds it to the list', () => {
      cargarPresentaciones();
      let aviso = '';
      service
        .guardarCfg('presentaciones', null, {
          nombre: '',
          descripcion: ' Bolsa de 750 gramos. ',
          cantidad: '750',
          unidad: 'gr',
        })
        .subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(API.presentaciones);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        cantidad: 750,
        unidad_medida: 'gr',
        descripcion: 'Bolsa de 750 gramos.',
      });
      req.flush({
        id: 5,
        cantidad: 750,
        unidad_medida: 'gr',
        descripcion: 'Bolsa de 750 gramos.',
        estado: true,
      });

      expect(service.presentacionesCfg()).toHaveLength(5);
      expect(service.presentacionesCfg()[4].nombre).toBe('750 gr');
      expect(aviso).toBe(
        'Presentación 750 gr registrada · disponible en los selectores de producto.',
      );
      expect(TestBed.inject(CatalogoService).presentacionOpciones()).toHaveLength(5);
    });

    it('edits a presentation through the API', () => {
      cargarPresentaciones();
      let aviso = '';
      service
        .guardarCfg('presentaciones', 3, {
          nombre: '',
          descripcion: 'Nueva.',
          cantidad: '600',
          unidad: 'gr',
        })
        .subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.presentaciones}/3`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ id: 3, cantidad: 600, unidad_medida: 'gr', descripcion: 'Nueva.', estado: true });

      expect(service.presentacionesCfg()[2].nombre).toBe('600 gr');
      expect(service.presentacionesCfg()).toHaveLength(4);
      expect(aviso).toBe('Presentación 600 gr actualizada.');
    });

    it('keeps the list and fails when the API rejects the presentation', () => {
      cargarPresentaciones();
      let error: unknown;
      service
        .guardarCfg('presentaciones', null, {
          nombre: '',
          descripcion: 'x',
          cantidad: '250',
          unidad: 'gr',
        })
        .subscribe({ error: (e) => (error = e) });

      httpMock
        .expectOne(API.presentaciones)
        .flush({ message: 'Ya existe' }, { status: 409, statusText: 'Conflict' });

      expect(error).toBeTruthy();
      expect(service.presentacionesCfg()).toHaveLength(4);
    });
  });
  describe('alternarCfg', () => {
    beforeEach(cargarCategorias);

    it('deactivates an active category through the API', () => {
      let aviso = '';
      service.alternarCfg('categorias', 1).subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.categorias}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ ...CATEGORIAS_CFG_DTO[0], estado: false });

      expect(service.categoriasCfg()[0].estado).toBe('Inactivo');
      expect(aviso).toBe(
        'Categoría Chifles desactivada · ya no aparece en nuevos registros y se mantiene en los productos existentes.',
      );
      expect(TestBed.inject(CatalogoService).categoriaOpciones()[0].activa).toBe(false);
    });

    it('reactivates an inactive category through the API', () => {
      let aviso = '';
      service.alternarCfg('categorias', 7).subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.categorias}/7/activate`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...CATEGORIAS_CFG_DTO[6], estado: true });

      expect(service.categoriasCfg()[6].estado).toBe('Activo');
      expect(aviso).toBe('Categoría Temporada reactivada.');
    });

    it('deactivates an active presentation through the API', () => {
      cargarPresentaciones();
      let aviso = '';
      service.alternarCfg('presentaciones', 1).subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.presentaciones}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ ...PRESENTACIONES_CFG_DTO[0], estado: false });

      expect(service.presentacionesCfg()[0].estado).toBe('Inactivo');
      expect(aviso).toContain('Presentación 100 gr desactivada');
      expect(TestBed.inject(CatalogoService).presentacionOpciones()[0].activa).toBe(false);
    });

    it('reactivates an inactive presentation through the API', () => {
      cargarPresentaciones();
      let aviso = '';
      service.alternarCfg('presentaciones', 4).subscribe((a) => (aviso = a));

      const req = httpMock.expectOne(`${API.presentaciones}/4/activate`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...PRESENTACIONES_CFG_DTO[3], estado: true });

      expect(service.presentacionesCfg()[3].estado).toBe('Activo');
      expect(aviso).toBe('Presentación 1 kg reactivada.');
    });
    it('emits an empty notice when the record does not exist', () => {
      let aviso: string | undefined;
      service.alternarCfg('categorias', 999).subscribe((a) => (aviso = a));

      expect(aviso).toBe('');
    });
  });

  describe('usosDe', () => {
    beforeEach(() => {
      cargarCategorias();
      cargarPresentaciones();
      TestBed.inject(CatalogoService).productos.set([
        makeProducto({
          id: 1,
          categoria: 'Chifles',
          presentaciones: [
            makePresentacion({ nombre: '100 gr' }),
            makePresentacion({ id: 2, nombre: '250 gr' }),
          ],
        }),
        makeProducto({
          id: 2,
          categoria: 'Chifles',
          presentaciones: [makePresentacion({ nombre: '100 gr' })],
        }),
        makeProducto({ id: 3, categoria: 'Camote', presentaciones: [makePresentacion()] }),
      ]);
    });

    it('counts the presentations of the real products in a category', () => {
      const chifles = service.categoriasCfg()[0];

      expect(service.usosDe('categorias', chifles)).toBe(3);
    });

    it('counts the presentations that use a presentation name (100 gr)', () => {
      const bolsa100 = service.presentacionesCfg()[0];

      expect(service.usosDe('presentaciones', bolsa100)).toBe(3);
    });
  });

  describe('lista', () => {
    it('returns the list that matches the tab', () => {
      expect(service.lista('categorias')).toBe(service.categoriasCfg());
      expect(service.lista('presentaciones')).toBe(service.presentacionesCfg());
    });
  });
});
