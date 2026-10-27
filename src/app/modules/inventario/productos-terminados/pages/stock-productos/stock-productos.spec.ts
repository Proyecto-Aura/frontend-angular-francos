import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ProductoPresentacionDto } from '../../interfaces/producto-presentacion-dto.interface';
import { StockProductos } from './stock-productos';

const PRODUCTO_PRESENTACIONES_BASE = `${environment.apiUrl}/producto-presentaciones`;
const INDICADORES_URL = `${environment.apiUrl}/productos-terminados/indicadores`;
const CATEGORIAS_BASE = `${environment.apiUrl}/categorias`;
const PRESENTACIONES_BASE = `${environment.apiUrl}/presentaciones`;
const LOTES_BASE = `${environment.apiUrl}/lotes-producto-terminado`;

const INDICADORES_VACIOS = { total: 0, normal: 0, alto: 0, bajo: 0, agotado: 0 };

function makeProductoPresentacionDto(
  overrides: Partial<ProductoPresentacionDto> = {},
): ProductoPresentacionDto {
  return {
    id: 7,
    sku: 'FR-P3-PR2',
    estado: true,
    producto_id: 3,
    presentacion_id: 2,
    producto: {
      id: 3,
      nombre: 'Pan de molde',
      descripcion: 'Pan de molde integral, bolsa sellada.',
      categoria: { id: 2, nombre: 'Panadería' },
    },
    presentacion: { id: 2, cantidad: 500, unidad_medida: 'gr' },
    producto_terminado: { id: 25, stock_actual: 45, stock_minimo: 10, stock_maximo: 300 },
    ...overrides,
  };
}

describe('StockProductos', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function expectLotesTotalRequest(): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '1',
    );
  }

  // Todos los tests pasan por aca: se consume la peticion del contador de
  // la pestaña "Lotes" (lotesTotal) apenas se crea el fixture, para que no
  // quede pendiente y rompa httpMock.verify() en tests que no la necesitan.
  function create(): ComponentFixture<StockProductos> {
    const fixture = TestBed.createComponent(StockProductos);
    fixture.detectChanges();
    expectLotesTotalRequest().flush({
      data: [],
      meta: { total: 0, page: 1, limit: 1, total_pages: 0 },
    });
    return fixture;
  }

  function expectPageRequest(page: number, limit: number): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === PRODUCTO_PRESENTACIONES_BASE &&
        request.params.get('page') === String(page) &&
        request.params.get('limit') === String(limit),
    );
  }

  function flushPage(
    req: TestRequest,
    data: ProductoPresentacionDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({ data, meta: { total, page, limit, total_pages: totalPages } });
  }

  function flushIndicadores(resumen = INDICADORES_VACIOS): void {
    httpMock.expectOne(INDICADORES_URL).flush(resumen);
  }

  function flushCategorias(): void {
    httpMock
      .expectOne((r) => r.url === CATEGORIAS_BASE)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
  }

  function flushPresentaciones(): void {
    httpMock
      .expectOne((r) => r.url === PRESENTACIONES_BASE)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
  }

  it('requests page 1, indicadores, categorias y presentaciones on init', () => {
    const fixture = create();

    const pageReq = expectPageRequest(1, 10);
    expect(pageReq.request.method).toBe('GET');
    flushPage(pageReq);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('exposes the indicadores response as the summary, renaming agotado to agotados', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores({ total: 16, normal: 10, alto: 1, bajo: 3, agotado: 2 });
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.resumen()).toEqual({
      total: 16,
      normal: 10,
      alto: 1,
      bajo: 3,
      agotados: 2,
    });
  });

  it('maps a row: une nombre/sku, formatea la presentación, calcula el nivel', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeProductoPresentacionDto()]);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.productos()).toEqual([
      {
        producto: {
          id: 7,
          productoTerminadoId: 25,
          sku: 'FR-P3-PR2',
          productoNombre: 'Pan de molde',
          productoDescripcion: 'Pan de molde integral, bolsa sellada.',
          categoriaId: 2,
          categoriaNombre: 'Panadería',
          presentacionId: 2,
          presentacionCantidad: 500,
          presentacionUnidadMedida: 'gr',
          estado: true,
          stockActual: 45,
          stockMinimo: 10,
          stockMaximo: 300,
        },
        productoNombre: 'Pan de molde',
        sku: 'FR-P3-PR2',
        categoriaNombre: 'Panadería',
        presentacionMostrada: '500 gr',
        stockActual: 45,
        stockMinimo: 10,
        stockMaximoMostrado: 300,
        nivel: 'normal',
        estado: true,
      },
    ]);
  });

  it('shows — for stock_maximo when viene null (sin tope definido), y nunca clasifica como alto', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [
      makeProductoPresentacionDto({
        producto_terminado: { id: 25, stock_actual: 500, stock_minimo: 10, stock_maximo: null },
      }),
    ]);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    const [fila] = fixture.componentInstance.productos();
    expect(fila.stockMaximoMostrado).toBe('—');
    expect(fila.nivel).toBe('normal');
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    fixture.componentInstance.setSearch('pan');
    httpMock
      .expectOne((r) => r.url === PRODUCTO_PRESENTACIONES_BASE && r.params.get('search') === 'pan')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setCategoria('2');
    httpMock
      .expectOne(
        (r) => r.url === PRODUCTO_PRESENTACIONES_BASE && r.params.get('categoria_id') === '2',
      )
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setPresentacion('2');
    httpMock
      .expectOne(
        (r) => r.url === PRODUCTO_PRESENTACIONES_BASE && r.params.get('presentacion_id') === '2',
      )
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setNivel('bajo');
    httpMock
      .expectOne((r) => r.url === PRODUCTO_PRESENTACIONES_BASE && r.params.get('nivel') === 'bajo')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    // El <select> manda el string 'false' y el componente lo convierte al
    // booleano literal que exige el backend.
    fixture.componentInstance.setEstado('false');
    httpMock
      .expectOne(
        (r) => r.url === PRODUCTO_PRESENTACIONES_BASE && r.params.get('estado') === 'false',
      )
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('ignores page changes outside the available range', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeProductoPresentacionDto()], 1, 10, 21, 3);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    fixture.componentInstance.cambiarPagina(0);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(1);

    httpMock.expectNone(PRODUCTO_PRESENTACIONES_BASE);
  });

  it('shows an error state with retry when the productos request fails', () => {
    const fixture = create();
    expectPageRequest(1, 10).flush('error', { status: 500, statusText: 'Server Error' });
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.errorCarga()).toBe(true);
  });

  it('falls back to a cleared summary when the indicadores request fails', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    httpMock.expectOne(INDICADORES_URL).flush('error', { status: 500, statusText: 'Server Error' });
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.resumen()).toEqual({
      total: 0,
      normal: 0,
      alto: 0,
      bajo: 0,
      agotados: 0,
    });
  });

  it('maps categoria y presentacion options for the filter selects', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();

    httpMock
      .expectOne((r) => r.url === CATEGORIAS_BASE)
      .flush({
        data: [{ id: 2, nombre: 'Panadería', descripcion: null, estado: true }],
        meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
      });
    httpMock
      .expectOne((r) => r.url === PRESENTACIONES_BASE)
      .flush({
        data: [{ id: 2, cantidad: 500, unidad_medida: 'gr', descripcion: null, estado: true }],
        meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
      });

    expect(fixture.componentInstance.categoriaOptions()).toEqual([
      { value: '2', label: 'Panadería' },
    ]);
    expect(fixture.componentInstance.presentacionOptions()).toEqual([
      { value: '2', label: '500 gr' },
    ]);
  });

  it('starts on the stock tab and switches to historial and lotes', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.activeTab()).toBe('stock');

    fixture.componentInstance.cambiarTab('historial');
    expect(fixture.componentInstance.activeTab()).toBe('historial');

    fixture.componentInstance.cambiarTab('lotes');
    expect(fixture.componentInstance.activeTab()).toBe('lotes');

    fixture.componentInstance.cambiarTab('stock');
    expect(fixture.componentInstance.activeTab()).toBe('stock');
  });

  it('opens and closes the movimiento modal from "Registrar movimiento", sin preseleccionar producto', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(false);

    fixture.componentInstance.abrirRegistrarMovimiento();
    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(true);
    expect(fixture.componentInstance.productoParaMovimiento()).toBeNull();

    fixture.componentInstance.cerrarFormMovimiento();
    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(false);
  });

  it('opens the movimiento modal preseleccionando el producto de la fila cuando se abre desde su icono', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeProductoPresentacionDto()]);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    const [fila] = fixture.componentInstance.productos();
    fixture.componentInstance.abrirRegistrarMovimiento(fila.producto);

    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(true);
    expect(fixture.componentInstance.productoParaMovimiento()).toBe(fila.producto);

    fixture.componentInstance.cerrarFormMovimiento();
    expect(fixture.componentInstance.productoParaMovimiento()).toBeNull();
  });

  it('closes the movimiento modal and reloads the list and the summary when a movimiento is saved', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    fixture.componentInstance.abrirRegistrarMovimiento();
    fixture.componentInstance.movimientoGuardado();

    expect(fixture.componentInstance.modalMovimientoAbierto()).toBe(false);
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
  });

  it('loads the lotes count for the "Lotes" tab badge on initialization', () => {
    const fixture = TestBed.createComponent(StockProductos);
    fixture.detectChanges();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();
    expectLotesTotalRequest().flush({
      data: [],
      meta: { total: 5, page: 1, limit: 1, total_pages: 5 },
    });

    expect(fixture.componentInstance.lotesTotal()).toBe(5);
    expect(fixture.componentInstance.tabs().find((t) => t.id === 'lotes')?.count).toBe(5);
  });

  it('resets the lotes count to zero when that request fails', () => {
    const fixture = TestBed.createComponent(StockProductos);
    fixture.detectChanges();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();
    expectLotesTotalRequest().flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.lotesTotal()).toBe(0);
  });

  it('opens and closes the detalle modal from "Ver detalle"', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeProductoPresentacionDto()]);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.productoEnDetalle()).toBeNull();

    const [fila] = fixture.componentInstance.productos();
    fixture.componentInstance.productoEnDetalle.set(fila.producto);
    expect(fixture.componentInstance.productoEnDetalle()).toEqual(fila.producto);

    fixture.componentInstance.productoEnDetalle.set(null);
    expect(fixture.componentInstance.productoEnDetalle()).toBeNull();
  });

  it('opens and closes the editar modal from "Editar"', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeProductoPresentacionDto()]);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    expect(fixture.componentInstance.productoEnEdicion()).toBeNull();

    const [fila] = fixture.componentInstance.productos();
    fixture.componentInstance.abrirEditar(fila.producto);
    expect(fixture.componentInstance.productoEnEdicion()).toEqual(fila.producto);

    fixture.componentInstance.cerrarEditar();
    expect(fixture.componentInstance.productoEnEdicion()).toBeNull();
  });

  it('closes the editar modal and reloads the list and the summary when a producto is saved', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeProductoPresentacionDto()]);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    const [fila] = fixture.componentInstance.productos();
    fixture.componentInstance.abrirEditar(fila.producto);
    fixture.componentInstance.productoEditado();

    expect(fixture.componentInstance.productoEnEdicion()).toBeNull();
    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
  });

  it('deactivates an active producto_presentacion and reloads the list and the summary', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeProductoPresentacionDto({ estado: true })]);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    const [fila] = fixture.componentInstance.productos();
    fixture.componentInstance.alternarEstado(fila.producto);

    const deleteReq = httpMock.expectOne(`${PRODUCTO_PRESENTACIONES_BASE}/7`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
  });

  it('activates an inactive producto_presentacion and reloads, ignorando el shape plano de la respuesta', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [
      makeProductoPresentacionDto({ id: 2, sku: 'FR-P3-PR9', estado: false }),
    ]);
    flushIndicadores();
    flushCategorias();
    flushPresentaciones();

    const [fila] = fixture.componentInstance.productos();
    fixture.componentInstance.alternarEstado(fila.producto);

    const activateReq = httpMock.expectOne(`${PRODUCTO_PRESENTACIONES_BASE}/2/activate`);
    expect(activateReq.request.method).toBe('PATCH');
    // El activate responde con el shape plano normal de producto_presentacion
    // (confirmado por el backend), no el embebido de GET /producto-presentaciones —
    // mapearlo con toProductoPresentacion() tiraba un TypeError y el refetch
    // de abajo nunca se disparaba (bug real reportado por el usuario).
    activateReq.flush({
      id: 2,
      sku: 'FR-P3-PR9',
      estado: true,
      producto_id: 3,
      presentacion_id: 2,
    });

    flushPage(expectPageRequest(1, 10));
    flushIndicadores();
  });
});
