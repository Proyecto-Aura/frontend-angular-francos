import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { DsTab } from '../../../../../shared/ds/tabs/tabs';
import { CfgFormModel, CfgTab, RegistroCfg } from '../../interfaces/producto.interface';
import { toProductos } from '../../mappers/producto.mapper';
import { CatalogoService } from '../../services/catalogo.service';
import { ConfiguracionCatalogoService } from '../../services/configuracion-catalogo.service';
import {
  API,
  CATEGORIAS_CFG_DTO,
  PRESENTACIONES_CFG_DTO,
  catalogoDto,
  flushCategoriasCfg,
  flushPresentacionesCfg,
} from '../../testing/catalogo.fixtures';
import { ConfiguracionCatalogo } from './configuracion-catalogo';

// Los miembros del componente son `protected`: el spec los consulta mediante esta vista tipada.
interface ConfiguracionCatalogoApi {
  tab: Signal<CfgTab>;
  query: { set(v: string): void };
  estadoFiltro: { set(v: string): void };
  aviso: Signal<string>;
  avisoTono: Signal<'ok' | 'error'>;
  errorApi: Signal<string>;
  filas: Signal<RegistroCfg[]>;
  todas: Signal<RegistroCfg[]>;
  subtitulo: Signal<string>;
  tabsDs: Signal<DsTab[]>;
  columns: Signal<DsColumn[]>;
  modo: Signal<'nuevo' | 'editar' | null>;
  cf: Signal<CfgFormModel>;
  errores: Signal<string[]>;
  confirmaId: Signal<number | null>;
  textoConfirma: Signal<string>;
  cambiarTab(id: string): void;
  nuevo(): void;
  editar(reg: RegistroCfg): void;
  cerrarForm(): void;
  setCampo(campo: keyof CfgFormModel, valor: string): void;
  guardar(): void;
  pedirDesactivar(reg: RegistroCfg): void;
  cancelarDesactivar(): void;
  alternar(reg: RegistroCfg): void;
}

describe('ConfiguracionCatalogo', () => {
  let fixture: ComponentFixture<ConfiguracionCatalogo>;
  let page: ConfiguracionCatalogoApi;
  let service: ConfiguracionCatalogoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConfiguracionCatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
    // La columna "Productos asociados" cuenta con los productos reales de la API.
    TestBed.inject(CatalogoService).productos.set(toProductos(catalogoDto()));
    fixture = TestBed.createComponent(ConfiguracionCatalogo);
    page = fixture.componentInstance as unknown as ConfiguracionCatalogoApi;
    fixture.detectChanges();
    flushCategoriasCfg(httpMock);
    flushPresentacionesCfg(httpMock);
  });

  afterEach(() => httpMock.verify());

  it('loads the categories from the API when it opens', () => {
    expect(service.categoriasCfg().map((c) => c.nombre)).toContain('Camote');
  });

  it('starts on the categories tab with every record', () => {
    expect(page.tab()).toBe('categorias');
    expect(page.filas()).toHaveLength(7);
    expect(page.subtitulo()).toBe(
      '7 de 7 registros · los inactivos se conservan en los productos existentes',
    );
  });

  it('shows the record count of each tab', () => {
    expect(page.tabsDs().map((t) => t.count)).toEqual([7, 4]);
  });

  it('switches tab and shows its records', () => {
    page.cambiarTab('presentaciones');

    expect(page.tab()).toBe('presentaciones');
    expect(page.todas().map((r) => r.nombre)).toEqual(['100 gr', '250 gr', '500 gr', '1 kg']);
  });

  it('shows name, description, associated products, state and actions in every tab', () => {
    const esperadas = ['nombre', 'descripcion', 'usos', 'estado', 'acciones'];
    expect(page.columns().map((c) => c.key)).toEqual(esperadas);

    page.cambiarTab('presentaciones');

    expect(page.columns().map((c) => c.key)).toEqual(esperadas);
  });

  it('filters by name and by state', () => {
    page.query.set('camote');
    expect(page.filas()).toHaveLength(1);

    page.query.set('');
    page.estadoFiltro.set('Inactivo');
    expect(page.filas().map((r) => r.nombre)).toEqual(['Temporada']);
    expect(page.subtitulo()).toContain('1 de 7 registros');
  });

  it('opens an empty form for a new record', () => {
    page.nuevo();

    expect(page.modo()).toBe('nuevo');
    expect(page.cf()).toEqual({ nombre: '', descripcion: '', cantidad: '', unidad: 'gr' });
  });

  it('loads the record data when editing', () => {
    const chifles = service.categoriasCfg()[0];

    page.editar(chifles);

    expect(page.modo()).toBe('editar');
    expect(page.cf()).toEqual({
      nombre: 'Chifles',
      descripcion: chifles.descripcion,
      cantidad: '',
      unidad: 'gr',
    });
  });

  it('does not save an invalid record and lists what is missing', () => {
    page.nuevo();

    page.guardar();

    expect(page.errores()).toEqual(['nombre', 'descripción']);
    expect(page.modo()).toBe('nuevo');
    expect(service.categoriasCfg()).toHaveLength(7);
  });

  it('saves a valid record through the API, shows the notice and closes the form', () => {
    page.nuevo();
    page.setCampo('nombre', 'Panadería');
    page.setCampo('descripcion', 'Productos de panadería.');

    page.guardar();
    httpMock.expectOne(API.categorias).flush({
      id: 8,
      nombre: 'Panadería',
      descripcion: 'Productos de panadería.',
      estado: true,
    });

    expect(service.categoriasCfg()).toHaveLength(8);
    expect(page.aviso()).toBe(
      'Categoría Panadería registrada · disponible en los selectores de producto.',
    );
    expect(page.avisoTono()).toBe('ok');
    expect(page.modo()).toBeNull();
  });

  it('keeps the form open and shows the API error when the name is rejected', () => {
    page.nuevo();
    page.setCampo('nombre', 'Panadería');
    page.setCampo('descripcion', 'Productos.');

    page.guardar();
    httpMock
      .expectOne(API.categorias)
      .flush(
        { message: 'Ya existe una categoria con este nombre' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(page.modo()).toBe('nuevo');
    expect(page.errorApi()).toBe('Ya existe una categoria con este nombre');
    expect(service.categoriasCfg()).toHaveLength(7);
  });

  it('asks for confirmation before deactivating and explains the associated products', () => {
    const chifles = service.categoriasCfg()[0];

    page.pedirDesactivar(chifles);

    expect(page.confirmaId()).toBe(1);
    expect(page.textoConfirma()).toContain('Hay 3 producto(s) asociados');
  });

  it('uses a plain message when the record has no associated products', () => {
    page.cambiarTab('presentaciones');
    const sinProductos = service.presentacionesCfg()[1];

    page.pedirDesactivar(sinProductos);

    expect(page.textoConfirma()).toContain('Puede reactivarse en cualquier momento');
  });

  it('cancels the deactivation', () => {
    page.pedirDesactivar(service.categoriasCfg()[0]);

    page.cancelarDesactivar();

    expect(page.confirmaId()).toBeNull();
    expect(service.categoriasCfg()[0].estado).toBe('Activo');
  });

  it('deactivates logically through the API, shows the notice and clears the confirmation', () => {
    const chifles = service.categoriasCfg()[0];
    page.pedirDesactivar(chifles);

    page.alternar(chifles);
    httpMock.expectOne(`${API.categorias}/1`).flush({ ...CATEGORIAS_CFG_DTO[0], estado: false });

    expect(service.categoriasCfg()[0].estado).toBe('Inactivo');
    expect(service.categoriasCfg()).toHaveLength(7);
    expect(page.aviso()).toContain('Categoría Chifles desactivada');
    expect(page.confirmaId()).toBeNull();
  });

  it('shows an error notice when the API refuses the state change', () => {
    page.alternar(service.categoriasCfg()[0]);
    httpMock
      .expectOne(`${API.categorias}/1`)
      .flush({ message: 'x' }, { status: 403, statusText: 'Forbidden' });

    expect(page.avisoTono()).toBe('error');
    expect(page.aviso()).toContain('No tiene permisos');
    expect(service.categoriasCfg()[0].estado).toBe('Activo');
  });

  it('drops a pending confirmation when changing tab', () => {
    page.pedirDesactivar(service.categoriasCfg()[0]);

    page.cambiarTab('presentaciones');

    expect(page.confirmaId()).toBeNull();
  });

  describe('pestaña de presentaciones (HU-A-041)', () => {
    beforeEach(() => page.cambiarTab('presentaciones'));

    it('loads the presentations from the API, named by quantity and unit', () => {
      expect(service.presentacionesCfg().map((p) => p.nombre)).toEqual([
        '100 gr',
        '250 gr',
        '500 gr',
        '1 kg',
      ]);
      expect(page.todas()[2].descripcion).toBe('');
      expect(page.todas()[3].estado).toBe('Inactivo');
    });

    it('opens the form with quantity and unit, not with a free name', () => {
      page.nuevo();
      fixture.detectChanges();

      expect(page.cf()).toEqual({ nombre: '', descripcion: '', cantidad: '', unidad: 'gr' });
      expect(document.body.textContent).toContain('Cantidad');
      expect(document.body.textContent).toContain('Unidad de medida');
      expect(document.body.textContent).not.toContain('Nombre de la presentación');
    });

    it('associates every label of the form with its control', () => {
      page.nuevo();
      fixture.detectChanges();

      for (const id of ['cfg-cantidad', 'cfg-unidad', 'cfg-descripcion']) {
        expect(document.body.querySelector(`label[for="${id}"]`)).not.toBeNull();
        expect(document.body.querySelector(`#${id}`)).not.toBeNull();
      }
    });

    it('loads quantity and unit of the record when editing', () => {
      page.editar(service.presentacionesCfg()[3]);

      expect(page.cf()).toEqual({
        nombre: '1 kg',
        descripcion: 'Bolsa de un kilo.',
        cantidad: '1',
        unidad: 'kg',
      });
    });

    it('lists what is missing before calling the API', () => {
      page.nuevo();

      page.guardar();

      expect(page.errores()).toEqual(['cantidad (entero entre 1 y 1.000.000)', 'descripción']);
      expect(page.modo()).toBe('nuevo');
    });

    it('saves a valid presentation through the API and shows its name', () => {
      page.nuevo();
      page.setCampo('cantidad', '750');
      page.setCampo('unidad', 'gr');
      page.setCampo('descripcion', 'Bolsa de 750 gramos.');

      page.guardar();
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

      expect(service.presentacionesCfg().map((p) => p.nombre)).toContain('750 gr');
      expect(page.aviso()).toBe(
        'Presentación 750 gr registrada · disponible en los selectores de producto.',
      );
      expect(page.avisoTono()).toBe('ok');
      expect(page.modo()).toBeNull();
    });

    it('keeps the form open and shows the API error when the combination already exists', () => {
      page.nuevo();
      page.setCampo('cantidad', '600');
      page.setCampo('descripcion', 'Otra bolsa.');

      page.guardar();
      httpMock
        .expectOne(API.presentaciones)
        .flush(
          { message: 'Ya existe una presentacion con esta cantidad y unidad de medida' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(page.modo()).toBe('nuevo');
      expect(page.errorApi()).toBe(
        'Ya existe una presentacion con esta cantidad y unidad de medida',
      );
      expect(service.presentacionesCfg()).toHaveLength(4);
    });

    it('deactivates through the API after confirming and explains the associated products', () => {
      const cien = service.presentacionesCfg()[0];
      page.pedirDesactivar(cien);
      expect(page.textoConfirma()).toContain('producto(s) asociados');

      page.alternar(cien);
      httpMock
        .expectOne(`${API.presentaciones}/1`)
        .flush({ ...PRESENTACIONES_CFG_DTO[0], estado: false });

      expect(service.presentacionesCfg()[0].estado).toBe('Inactivo');
      expect(page.aviso()).toContain('Presentación 100 gr desactivada');
      expect(page.confirmaId()).toBeNull();
    });

    it('reactivates through the API without asking for confirmation', () => {
      page.alternar(service.presentacionesCfg()[3]);
      const req = httpMock.expectOne(`${API.presentaciones}/4/activate`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...PRESENTACIONES_CFG_DTO[3], estado: true });

      expect(service.presentacionesCfg()[3].estado).toBe('Activo');
      expect(page.aviso()).toBe('Presentación 1 kg reactivada.');
    });
  });
});
