import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectOption } from '../../../../../shared/ds/select/select';
import {
  PresentacionForm,
  ProductoFormModel,
  ResultadoGuardado,
} from '../../interfaces/producto.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { API, archivoImagen, flushCatalogo } from '../../testing/catalogo.fixtures';
import { ProductoForm } from './producto-form';

// Los miembros del componente son `protected`: el spec los consulta mediante esta vista tipada.
interface ProductoFormApi {
  pf: { (): ProductoFormModel; set(v: ProductoFormModel): void };
  errores: Signal<string[]>;
  errorApi: Signal<string>;
  guardando: Signal<boolean>;
  titulo: Signal<string>;
  categoriaOptions: Signal<SelectOption[]>;
  presentacionOptions(actual: string): SelectOption[];
  setCampo(campo: 'nombre' | 'categoriaId' | 'descripcion', valor: string): void;
  setPres<K extends keyof PresentacionForm>(
    idx: number,
    campo: K,
    valor: PresentacionForm[K],
  ): void;
  agregarPres(): void;
  elegirImagen(idx: number, evento: Event): void;
  tamano(archivo: File): string;
  quitarPres(idx: number): void;
  puedeQuitar(p: PresentacionForm): boolean;
  skuDePresentacion(p: PresentacionForm): string;
  guardar(): void;
  cerrar(): void;
}

describe('ProductoForm', () => {
  let fixture: ComponentFixture<ProductoForm>;
  let service: CatalogoService;
  let httpMock: HttpTestingController;
  let guardados: ResultadoGuardado[];
  let cierres: number;

  function api(): ProductoFormApi {
    return fixture.componentInstance as unknown as ProductoFormApi;
  }

  function abrir(modo: 'nuevo' | 'editar' | null, productoId?: number): void {
    fixture.componentRef.setInput('modo', modo);
    if (productoId !== undefined) {
      fixture.componentRef.setInput(
        'producto',
        service.productos().find((p) => p.id === productoId) ?? null,
      );
    }
    fixture.detectChanges();
  }

  function completarFormulario(): void {
    api().setCampo('nombre', 'Chifles BBQ');
    api().setCampo('descripcion', 'Sabor BBQ.');
    api().setPres(0, 'presentacionId', '1');
    api().setPres(0, 'precioUnit', '6');
    api().setPres(0, 'precioMayor', '5');
    api().setPres(0, 'umbral', '12');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
    service.cargar();
    flushCatalogo(httpMock);

    fixture = TestBed.createComponent(ProductoForm);
    guardados = [];
    cierres = 0;
    fixture.componentInstance.guardado.subscribe((aviso) => guardados.push(aviso));
    fixture.componentInstance.closed.subscribe(() => cierres++);
  });

  afterEach(() => httpMock.verify());

  it('opens an empty form with the first active category', () => {
    abrir('nuevo');

    expect(api().titulo()).toBe('Registrar producto');
    expect(api().pf().nombre).toBe('');
    expect(api().pf().categoriaId).toBe('1');
    expect(api().pf().presentaciones).toHaveLength(1);
    expect(api().errores()).toEqual([]);
    expect(api().errorApi()).toBe('');
  });

  it('loads the product to edit', () => {
    abrir('editar', 1);

    expect(api().titulo()).toBe('Editar producto');
    expect(api().pf().nombre).toBe('Chifles clásicos');
    expect(api().pf().categoriaId).toBe('1');
    expect(api().pf().presentaciones).toHaveLength(2);
    expect(api().pf().presentaciones[0].precioUnit).toBe('5.5');
    expect(api().pf().presentaciones[0].productoPresentacionId).toBe(11);
  });

  it('adds new presentations and removes only the ones not saved yet', () => {
    abrir('editar', 1);

    api().agregarPres();
    expect(api().pf().presentaciones).toHaveLength(3);
    expect(api().puedeQuitar(api().pf().presentaciones[0])).toBe(false);
    expect(api().puedeQuitar(api().pf().presentaciones[2])).toBe(true);

    api().quitarPres(2);
    expect(api().pf().presentaciones).toHaveLength(2);
  });

  it('does not allow removing the only presentation of a new product', () => {
    abrir('nuevo');

    expect(api().puedeQuitar(api().pf().presentaciones[0])).toBe(false);
    api().agregarPres();
    expect(api().puedeQuitar(api().pf().presentaciones[1])).toBe(true);
  });

  it('shows the real SKU for saved presentations and a note for new ones', () => {
    abrir('editar', 1);
    expect(api().skuDePresentacion(api().pf().presentaciones[1])).toBe('FR-P1-PR2');

    abrir('nuevo');
    expect(api().skuDePresentacion(api().pf().presentaciones[0])).toBe(
      'SKU asignado automáticamente al guardar',
    );
  });

  it('keeps an inactive category visible only when it is the current one', () => {
    abrir('nuevo');
    expect(
      api()
        .categoriaOptions()
        .map((o) => o.value),
    ).not.toContain('5');

    api().setCampo('categoriaId', '5');

    const opcion = api()
      .categoriaOptions()
      .find((o) => o.value === '5');
    expect(opcion?.label).toBe('Temporada (inactiva)');
  });

  it('offers the active presentations with their label, and the current one even if inactive', () => {
    abrir('nuevo');

    const opciones = api().presentacionOptions('');
    expect(opciones[0]).toEqual({ value: '', label: 'Seleccionar presentación' });
    expect(opciones.map((o) => o.label)).toContain('1 kg');
    expect(opciones.map((o) => o.value)).not.toContain('7');
    expect(
      api()
        .presentacionOptions('7')
        .find((o) => o.value === '7')?.label,
    ).toBe('500 gr (inactiva)');
  });

  it('does not save and lists the missing fields when the form is invalid', () => {
    abrir('nuevo');

    api().guardar();

    expect(api().errores()).toContain('nombre del producto');
    expect(guardados).toEqual([]);
    expect(cierres).toBe(0);
    httpMock.expectNone(API.productos);
  });

  it('registers a valid product, emits the notice and closes', () => {
    abrir('nuevo');
    completarFormulario();

    api().guardar();
    expect(api().guardando()).toBe(true);

    httpMock.expectOne(API.productos).flush({
      id: 8,
      producto_presentaciones: [{ id: 81, sku: 'FR-P8-PR1', presentacion_id: 1 }],
    });
    flushCatalogo(httpMock);

    expect(api().guardando()).toBe(false);
    expect(guardados).toHaveLength(1);
    expect(guardados[0].tono).toBe('ok');
    expect(guardados[0].mensaje).toContain('Producto registrado · SKU FR-P8-PR1');
    expect(cierres).toBe(1);
  });

  it('ignores a second click while it is saving', () => {
    abrir('nuevo');
    completarFormulario();

    api().guardar();
    api().guardar();

    expect(httpMock.match(API.productos)).toHaveLength(1);
  });

  it('updates the edited product, emits the notice and closes', () => {
    abrir('editar', 1);
    api().setCampo('nombre', 'Chifles clásicos XL');

    api().guardar();

    httpMock.expectOne(`${API.productos}/1`).flush({});
    httpMock.expectOne(`${API.productoPresentaciones}/11`).flush({});
    // La primera presentación tiene una promoción vigente: también se guarda.
    httpMock.expectOne(`${API.promociones}/91`).flush({});
    httpMock.expectOne(`${API.productoPresentaciones}/12`).flush({});
    flushCatalogo(httpMock);

    expect(guardados).toEqual([
      {
        tono: 'ok',
        mensaje: 'Producto actualizado · el SKU y el slug se mantienen sin cambios.',
      },
    ]);
    expect(cierres).toBe(1);
  });

  it('keeps the form open and shows the API reason when the product cannot be saved', () => {
    abrir('nuevo');
    completarFormulario();

    api().guardar();
    httpMock
      .expectOne(API.productos)
      .flush(
        { statusCode: 409, message: 'Ya existe un producto registrado con ese nombre' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(api().errorApi()).toBe('Ya existe un producto registrado con ese nombre');
    expect(api().guardando()).toBe(false);
    expect(guardados).toEqual([]);
    expect(cierres).toBe(0);
  });

  it('explains missing permissions on 403', () => {
    abrir('nuevo');
    completarFormulario();

    api().guardar();
    httpMock
      .expectOne(API.productos)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(api().errorApi()).toBe('No tiene permisos para gestionar el catálogo de productos.');
  });

  it('closes without saving', () => {
    abrir('nuevo');

    api().cerrar();

    expect(cierres).toBe(1);
    expect(guardados).toEqual([]);
  });

  describe('imagen de la presentación', () => {
    const eventoCon = (archivo: File | null) =>
      ({ target: { files: archivo ? [archivo] : [] } }) as unknown as Event;

    it('offers a file picker that only accepts JPG, PNG and WEBP', () => {
      abrir('nuevo');

      const input = document.body.querySelector<HTMLInputElement>('input[type="file"]');
      expect(input).not.toBeNull();
      expect(input?.accept).toBe('image/jpeg,image/png,image/webp');
    });

    it('keeps the chosen file of the presentation and clears it when none is chosen', () => {
      abrir('nuevo');
      const archivo = archivoImagen('chifles.png');

      api().elegirImagen(0, eventoCon(archivo));
      expect(api().pf().presentaciones[0].imagenArchivo).toBe(archivo);

      api().elegirImagen(0, eventoCon(null));
      expect(api().pf().presentaciones[0].imagenArchivo).toBeNull();
    });

    it('formats the size of the chosen file', () => {
      expect(api().tamano(archivoImagen('a.png', 'image/png', 500))).toBe('1 KB');
      expect(api().tamano(archivoImagen('a.png', 'image/png', 300 * 1024))).toBe('300 KB');
      expect(api().tamano(archivoImagen('a.png', 'image/png', 1.5 * 1024 * 1024))).toBe('1.5 MB');
    });

    it('shows the current image of a saved presentation', () => {
      abrir('editar', 1);

      const imagen = document.body.querySelector<HTMLImageElement>(
        'img[alt="Imagen actual de la presentación 1"]',
      );
      expect(imagen?.getAttribute('src')).toBe('https://cdn.test/chifles-100.jpg');
    });

    it('does not save and lists the error when the chosen file is not allowed', () => {
      abrir('nuevo');
      completarFormulario();
      api().elegirImagen(0, eventoCon(archivoImagen('a.gif', 'image/gif')));

      api().guardar();

      expect(api().errores()).toContain('la imagen debe ser JPG, PNG o WEBP (presentación 1)');
      httpMock.expectNone(API.productos);
      expect(cierres).toBe(0);
    });

    it('creates the product, uploads the chosen image and closes', () => {
      abrir('nuevo');
      completarFormulario();
      const archivo = archivoImagen('chifles.png');
      api().elegirImagen(0, eventoCon(archivo));

      api().guardar();
      httpMock
        .expectOne(API.productos)
        .flush({
          id: 8,
          producto_presentaciones: [{ id: 81, sku: 'FR-P8-PR1', presentacion_id: 1 }],
        });
      const subida = httpMock.expectOne(`${API.productoPresentaciones}/81/imagen`);
      expect((subida.request.body as FormData).get('imagen')).toBe(archivo);
      subida.flush({});
      flushCatalogo(httpMock);

      expect(guardados[0].tono).toBe('ok');
      expect(cierres).toBe(1);
    });
  });
});
