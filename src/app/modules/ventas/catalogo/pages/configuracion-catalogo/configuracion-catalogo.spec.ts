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
  catalogoDto,
  flushCategoriasCfg,
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
    expect(page.tabsDs().map((t) => t.count)).toEqual([7, 8]);
  });

  it('switches tab and shows its records', () => {
    page.cambiarTab('presentaciones');

    expect(page.tab()).toBe('presentaciones');
    expect(page.todas()).toHaveLength(8);
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
    expect(page.cf()).toEqual({ nombre: '', descripcion: '' });
  });

  it('loads the record data when editing', () => {
    const chifles = service.categoriasCfg()[0];

    page.editar(chifles);

    expect(page.modo()).toBe('editar');
    expect(page.cf()).toEqual({ nombre: 'Chifles', descripcion: chifles.descripcion });
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
    const packX12 = service.presentacionesCfg()[6];

    page.pedirDesactivar(packX12);

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
});
