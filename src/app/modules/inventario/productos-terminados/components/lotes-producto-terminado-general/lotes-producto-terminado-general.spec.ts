import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { LoteProductoTerminadoDto } from '../../interfaces/lote-producto-terminado-dto.interface';
import { ProductoPresentacionDto } from '../../interfaces/producto-presentacion-dto.interface';
import { LotesProductoTerminadoGeneral } from './lotes-producto-terminado-general';

const LOTES_BASE = `${environment.apiUrl}/lotes-producto-terminado`;
const PRODUCTO_PRESENTACIONES_BASE = `${environment.apiUrl}/producto-presentaciones`;

function makeLoteDto(overrides: Partial<LoteProductoTerminadoDto> = {}): LoteProductoTerminadoDto {
  return {
    id: 1,
    producto_terminado_id: 256,
    sku: 'DEMO-MOV-PT-001',
    producto_id: 3,
    producto_nombre: 'Pan de molde',
    categoria_id: 2,
    categoria_nombre: 'Panadería',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    codigo_lote: 'FR-LTP-005-260910-PT256',
    fecha_produccion: '2026-09-10',
    fecha_vencimiento: '2026-12-10',
    cantidad_inicial: 100,
    cantidad_actual: 60,
    estado: 'activo',
    activo: true,
    created_at: '2026-09-10T00:00:00.000Z',
    updated_at: '2026-09-10T00:00:00.000Z',
    ...overrides,
  };
}

function makeProductoDto(
  overrides: Partial<ProductoPresentacionDto> = {},
): ProductoPresentacionDto {
  return {
    id: 7,
    sku: 'DEMO-MOV-PT-001',
    estado: true,
    producto_id: 3,
    presentacion_id: 2,
    producto: {
      id: 3,
      nombre: 'Pan de molde',
      descripcion: null,
      categoria: { id: 2, nombre: 'Panadería' },
    },
    presentacion: { id: 2, cantidad: 500, unidad_medida: 'gr' },
    producto_terminado: { id: 256, stock_actual: 60, stock_minimo: 20, stock_maximo: 200 },
    ...overrides,
  };
}

describe('LotesProductoTerminadoGeneral', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<LotesProductoTerminadoGeneral> {
    const fixture = TestBed.createComponent(LotesProductoTerminadoGeneral);
    fixture.detectChanges();
    return fixture;
  }

  function expectLotesRequest(): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '10',
    );
  }

  function expectProductosRequest(): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === PRODUCTO_PRESENTACIONES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
  }

  function flushLotes(
    req: TestRequest,
    data: LoteProductoTerminadoDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({ data, meta: { total, page, limit, total_pages: totalPages } });
  }

  function flushProductos(data: ProductoPresentacionDto[] = []): void {
    expectProductosRequest().flush({
      data,
      meta: { total: data.length, page: 1, limit: 100, total_pages: data.length > 0 ? 1 : 0 },
    });
  }

  it('requests lotes and el catalogo de productos (en paralelo) as soon as it loads, with no filters', () => {
    const fixture = create();
    const lotesReq = expectLotesRequest();
    expect(lotesReq.request.params.has('search')).toBe(false);
    expect(lotesReq.request.params.has('producto_terminado_id')).toBe(false);
    expect(lotesReq.request.params.has('estado')).toBe(false);
    expect(lotesReq.request.params.has('vence_desde')).toBe(false);
    expect(lotesReq.request.params.has('vence_hasta')).toBe(false);

    flushLotes(lotesReq);
    flushProductos([makeProductoDto()]);

    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('maps a fila directamente del shape embebido (sin resolver via catalogo)', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [makeLoteDto()]);
    flushProductos();

    const [fila] = fixture.componentInstance.lotes();
    expect(fila).toMatchObject({
      codigoLote: 'FR-LTP-005-260910-PT256',
      productoNombre: 'Pan de molde',
      sku: 'DEMO-MOV-PT-001',
      cantidadInicialMostrada: '100',
      cantidadActualMostrada: '60',
      estado: 'activo',
      diasParaVencer: null,
    });
  });

  it('computes diasParaVencer solo cuando el backend ya clasifico el lote como por_vencer', () => {
    const fixture = create();
    const hoy = new Date();
    const enDiezDias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 10);
    const fechaVencimiento = `${enDiezDias.getFullYear()}-${String(enDiezDias.getMonth() + 1).padStart(2, '0')}-${String(enDiezDias.getDate()).padStart(2, '0')}`;

    flushLotes(expectLotesRequest(), [
      makeLoteDto({ estado: 'por_vencer', fecha_vencimiento: fechaVencimiento }),
    ]);
    flushProductos();

    const [fila] = fixture.componentInstance.lotes();
    expect(fila.diasParaVencer).toBe(10);
  });

  it('orders lotes by fecha_vencimiento ascendente (los mas proximos a vencer primero), sin fecha al final', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [
      makeLoteDto({ id: 1, codigo_lote: 'SIN-FECHA', fecha_vencimiento: null }),
      makeLoteDto({ id: 2, codigo_lote: 'LEJOS', fecha_vencimiento: '2026-12-01' }),
      makeLoteDto({ id: 3, codigo_lote: 'CERCA', fecha_vencimiento: '2026-10-15' }),
    ]);
    flushProductos();

    expect(fixture.componentInstance.lotes().map((l) => l.codigoLote)).toEqual([
      'CERCA',
      'LEJOS',
      'SIN-FECHA',
    ]);
  });

  it('loads el catalogo de productos con productoTerminadoId resuelto into the producto filter select', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    flushProductos([makeProductoDto(), makeProductoDto({ id: 8, producto_terminado: null })]);

    expect(fixture.componentInstance.productoOptions()).toEqual([
      { value: '256', label: 'DEMO-MOV-PT-001 · Pan de molde' },
    ]);
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    flushProductos();

    fixture.componentInstance.setSearch('pan');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('search') === 'pan')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setProducto('256');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('producto_terminado_id') === '256')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setEstado('por_vencer');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('estado') === 'por_vencer')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setVenceDesde('2026-10-01');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('vence_desde') === '2026-10-01')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setVenceHasta('2026-10-31');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('vence_hasta') === '2026-10-31')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    expect(fixture.componentInstance.hayFiltros()).toBe(true);
  });

  it('does not call the backend when vence desde es posterior a vence hasta', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    flushProductos();

    fixture.componentInstance.setVenceDesde('2026-10-31');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('vence_desde') === '2026-10-31')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setVenceHasta('2026-10-01');

    expect(fixture.componentInstance.rangoInvalido()).toBe(true);
    httpMock.expectNone(
      (r) => r.url === LOTES_BASE && r.params.get('vence_hasta') === '2026-10-01',
    );
  });

  it('limpiarFiltros resets everything to page 1 and reloads with no filters', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    flushProductos();

    fixture.componentInstance.setSearch('pan');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('search') === 'pan')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    expect(fixture.componentInstance.hayFiltros()).toBe(true);
    fixture.componentInstance.limpiarFiltros();

    const req = httpMock.expectOne(
      (r) =>
        r.url === LOTES_BASE &&
        r.params.get('page') === '1' &&
        !r.params.has('search') &&
        !r.params.has('producto_terminado_id') &&
        !r.params.has('estado') &&
        !r.params.has('vence_desde') &&
        !r.params.has('vence_hasta'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
    expect(fixture.componentInstance.hayFiltros()).toBe(false);
  });

  it('ignores page changes outside the available range', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [makeLoteDto()], 1, 10, 21, 3);
    flushProductos();

    fixture.componentInstance.cambiarPagina(0);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(1);

    httpMock.expectNone(LOTES_BASE);
  });

  it('shows an error state with retry when the lotes request fails', () => {
    const fixture = create();
    expectLotesRequest().flush('error', { status: 500, statusText: 'Server Error' });
    flushProductos();

    expect(fixture.componentInstance.errorCarga()).toBe(true);

    fixture.componentInstance.cargarLotes();
    flushLotes(expectLotesRequest());

    expect(fixture.componentInstance.errorCarga()).toBe(false);
  });

  it('falls back to an empty producto catalog when that request fails, keeping lotes usable', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [makeLoteDto()]);
    expectProductosRequest().flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.productoOptions()).toEqual([]);
    expect(fixture.componentInstance.lotes()[0].productoNombre).toBe('Pan de molde');
  });
});
