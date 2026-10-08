import { Signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilaCatalogo, Producto } from '../../interfaces/producto.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { ListarCatalogo } from './listar-catalogo';

// Los miembros de la página son `protected`: el spec los consulta mediante esta vista tipada.
interface ListarCatalogoApi {
  page: WritableSignal<number>;
  vista: Signal<'tarjetas' | 'tabla'>;
  filasFiltradas: Signal<FilaCatalogo[]>;
  filasPagina: Signal<FilaCatalogo[]>;
  pageSize: Signal<number>;
  pageCount: Signal<number>;
  paginaActual: Signal<number>;
  formModo: Signal<'nuevo' | 'editar' | null>;
  productoEnEdicion: Signal<Producto | null>;
  filaDetalle: Signal<FilaCatalogo | null>;
  aviso: Signal<string>;
  setQuery(v: string): void;
  setCategoria(v: string): void;
  setPresentacion(v: string): void;
  setEstado(v: string): void;
  setDisp(v: string): void;
  setVista(v: 'tarjetas' | 'tabla'): void;
  dispTone(f: FilaCatalogo): string;
  dispLabel(f: FilaCatalogo): string;
  dispTexto(f: FilaCatalogo): string;
  estadoTone(estado: FilaCatalogo['estado']): string;
  nuevoProducto(): void;
  editarProducto(f: FilaCatalogo): void;
  cerrarForm(): void;
  verProducto(f: FilaCatalogo): void;
  mostrarAviso(texto: string): void;
  alternarEstado(f: FilaCatalogo): void;
}

function makeFila(overrides: Partial<FilaCatalogo> = {}): FilaCatalogo {
  return {
    productoId: 1,
    presentacionId: 1,
    nombre: 'Chifles clásicos',
    categoria: 'Chifles',
    destacado: true,
    presentacion: 'Bolsa 100 g',
    precioUnit: 5.5,
    precioMayor: 4.2,
    umbral: 24,
    promo: null,
    estado: 'Activo',
    stock: 480,
    visible: false,
    sku: 'FR-P1-PR1',
    ...overrides,
  };
}

describe('ListarCatalogo', () => {
  let fixture: ComponentFixture<ListarCatalogo>;
  let page: ListarCatalogoApi;
  let service: CatalogoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CatalogoService);
    fixture = TestBed.createComponent(ListarCatalogo);
    page = fixture.componentInstance as unknown as ListarCatalogoApi;
    fixture.detectChanges();
  });

  it('lists every presentation in the cards view', () => {
    expect(page.vista()).toBe('tarjetas');
    expect(page.pageSize()).toBe(12);
    expect(page.filasFiltradas()).toHaveLength(9);
    expect(page.filasPagina()).toHaveLength(9);
    expect(page.pageCount()).toBe(1);
  });

  it('paginates five rows per page in the table view and goes back to page one', () => {
    page.page.set(1);
    page.setVista('tabla');

    expect(page.pageSize()).toBe(5);
    expect(page.pageCount()).toBe(2);
    expect(page.filasPagina()).toHaveLength(5);

    page.page.set(2);
    expect(page.filasPagina()).toHaveLength(4);

    page.setVista('tarjetas');
    expect(page.page()).toBe(1);
  });

  it('clamps the current page to the last available page', () => {
    page.setVista('tabla');
    page.page.set(99);

    expect(page.paginaActual()).toBe(2);
  });

  it('filters by product name ignoring case', () => {
    page.setQuery('CHIFLES');

    expect(page.filasFiltradas().map((f) => f.sku)).toEqual([
      'FR-P1-PR1',
      'FR-P1-PR2',
      'FR-P2-PR1',
    ]);
  });

  it('filters by category', () => {
    page.setCategoria('Camote');

    expect(page.filasFiltradas()).toHaveLength(2);
  });

  it('filters by presentation', () => {
    page.setPresentacion('Pack x6');

    expect(page.filasFiltradas().map((f) => f.sku)).toEqual(['FR-P5-PR2']);
  });

  it('filters by state', () => {
    page.setEstado('Inactivo');

    expect(page.filasFiltradas().map((f) => f.sku)).toEqual(['FR-P7-PR1']);
  });

  it('filters by availability', () => {
    page.setDisp('agotado');
    expect(page.filasFiltradas().map((f) => f.sku)).toEqual(['FR-P7-PR1']);

    page.setDisp('disponible');
    expect(page.filasFiltradas()).toHaveLength(8);
  });

  it('combines filters', () => {
    page.setCategoria('Chifles');
    page.setQuery('picantes');

    expect(page.filasFiltradas()).toHaveLength(1);
  });

  it('returns to page one whenever a filter changes', () => {
    page.setVista('tabla');
    page.page.set(2);

    page.setCategoria('Camote');

    expect(page.page()).toBe(1);
  });

  it('maps availability to badge tone and label', () => {
    const agotado = makeFila({ stock: 0 });
    const bajo = makeFila({ stock: 5, umbral: 10 });
    const disponible = makeFila({ stock: 480 });

    expect(page.dispTone(agotado)).toBe('danger');
    expect(page.dispTone(bajo)).toBe('warning');
    expect(page.dispTone(disponible)).toBe('success');
    expect(page.dispLabel(agotado)).toBe('Agotado');
    expect(page.dispLabel(bajo)).toBe('Stock bajo');
    expect(page.dispLabel(disponible)).toBe('Disponible');
  });

  it('describes the stock of each availability level', () => {
    expect(page.dispTexto(makeFila({ stock: 0 }))).toBe('Agotado');
    expect(page.dispTexto(makeFila({ stock: 5, umbral: 10 }))).toBe(
      '5 unid · bajo el umbral mayorista',
    );
    expect(page.dispTexto(makeFila({ stock: 12, umbral: 10 }))).toBe('12 unid disponibles');
  });

  it('maps the state to its badge tone', () => {
    expect(page.estadoTone('Activo')).toBe('success');
    expect(page.estadoTone('Inactivo')).toBe('neutral');
  });

  it('opens the form to register a product', () => {
    page.nuevoProducto();

    expect(page.formModo()).toBe('nuevo');
    expect(page.productoEnEdicion()).toBeNull();
  });

  it('opens the form to edit the product of the selected row and closes the detail', () => {
    page.verProducto(makeFila());
    page.editarProducto(makeFila({ productoId: 2, presentacionId: 1, sku: 'FR-P2-PR1' }));

    expect(page.formModo()).toBe('editar');
    expect(page.productoEnEdicion()?.nombre).toBe('Chifles picantes');
    expect(page.filaDetalle()).toBeNull();
  });

  it('closes the form', () => {
    page.nuevoProducto();

    page.cerrarForm();

    expect(page.formModo()).toBeNull();
    expect(page.productoEnEdicion()).toBeNull();
  });

  it('resolves the detail by SKU so it reflects later changes', () => {
    page.verProducto(makeFila());
    expect(page.filaDetalle()?.estado).toBe('Activo');

    service.alternarEstadoPresentacion(1, 1);

    expect(page.filaDetalle()?.estado).toBe('Inactivo');
  });

  it('shows the notice returned by the form', () => {
    page.mostrarAviso('Producto registrado');

    expect(page.aviso()).toBe('Producto registrado');
  });

  it('toggles a presentation and shows the notice', () => {
    page.alternarEstado(makeFila());

    expect(page.aviso()).toBe('Presentación FR-P1-PR1 desactivada de forma lógica.');
    expect(page.filasFiltradas().find((f) => f.sku === 'FR-P1-PR1')?.estado).toBe('Inactivo');
  });
});
