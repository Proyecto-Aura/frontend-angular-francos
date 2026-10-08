import { Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { DsTab } from '../../../../../shared/ds/tabs/tabs';
import { CfgFormModel, CfgTab, RegistroCfg } from '../../interfaces/producto.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { ConfiguracionCatalogo } from './configuracion-catalogo';

// Los miembros del componente son `protected`: el spec los consulta mediante esta vista tipada.
interface ConfiguracionCatalogoApi {
  tab: Signal<CfgTab>;
  query: { set(v: string): void };
  estadoFiltro: { set(v: string): void };
  aviso: Signal<string>;
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
  let service: CatalogoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CatalogoService);
    fixture = TestBed.createComponent(ConfiguracionCatalogo);
    page = fixture.componentInstance as unknown as ConfiguracionCatalogoApi;
    fixture.detectChanges();
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

  it('saves a valid record, shows the notice and closes the form', () => {
    page.nuevo();
    page.setCampo('nombre', 'Panadería');
    page.setCampo('descripcion', 'Productos de panadería.');

    page.guardar();

    expect(service.categoriasCfg()).toHaveLength(8);
    expect(page.aviso()).toBe(
      'Categoría Panadería registrada · disponible en los selectores de producto.',
    );
    expect(page.modo()).toBeNull();
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

  it('deactivates logically, shows the notice and clears the confirmation', () => {
    const chifles = service.categoriasCfg()[0];
    page.pedirDesactivar(chifles);

    page.alternar(chifles);

    expect(service.categoriasCfg()[0].estado).toBe('Inactivo');
    expect(service.categoriasCfg()).toHaveLength(7);
    expect(page.aviso()).toContain('Categoría Chifles desactivada');
    expect(page.confirmaId()).toBeNull();
  });

  it('drops a pending confirmation when changing tab', () => {
    page.pedirDesactivar(service.categoriasCfg()[0]);

    page.cambiarTab('presentaciones');

    expect(page.confirmaId()).toBeNull();
  });
});
