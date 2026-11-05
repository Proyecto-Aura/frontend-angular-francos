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

const LOTES_BASE = `${environment.apiUrl}/produccion/lotes-producto-terminado`;
const PRODUCTOS_BASE = `${environment.apiUrl}/producto-presentaciones`;

function makeLoteDto(overrides: Partial<LoteProductoTerminadoDto> = {}): LoteProductoTerminadoDto {
  return {
    id: 1,
    producto_terminado_id: 256,
    sku: 'FR-P3-PR2',
    producto_nombre: 'Camote frito',
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    codigo_lote: 'FR-LT-005-260910-PT256',
    fecha_produccion: '2026-09-10',
    fecha_vencimiento: '2026-12-10',
    cantidad_inicial: 100,
    cantidad_actual: 60,
    estado: 'activo',
    activo: true,
    ...overrides,
  };
}

function makeProductoDto(
  overrides: Partial<ProductoPresentacionDto> = {},
): ProductoPresentacionDto {
  return {
    id: 7,
    sku: 'FR-P3-PR2',
    estado: true,
    producto: { id: 3, nombre: 'Camote frito' },
    presentacion: { id: 2, cantidad: 500, unidad_medida: 'gr' },
    producto_terminado: { id: 256, stock_actual: 0 },
    ...overrides,
  };
}

describe('LotesProductoTerminadoGeneral (Produccion)', () => {
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
    return httpMock.expectOne((request) => request.url === PRODUCTOS_BASE);
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

  it('requests lotes y el catalogo de productos (en paralelo) al cargar, sin filtros', () => {
    const fixture = create();
    const lotesReq = expectLotesRequest();
    expect(lotesReq.request.params.has('search')).toBe(false);
    expect(lotesReq.request.params.has('producto_terminado_id')).toBe(false);

    flushLotes(lotesReq);
    flushProductos([makeProductoDto()]);

    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('maps a fila directamente del shape embebido', () => {
    const fixture = create();
    flushLotes(expectLotesRequest(), [makeLoteDto()]);
    flushProductos();

    const [fila] = fixture.componentInstance.lotes();
    expect(fila).toMatchObject({
      codigoLote: 'FR-LT-005-260910-PT256',
      productoNombre: 'Camote frito',
      productoConPresentacion: 'Camote frito · 500 gr',
      sku: 'FR-P3-PR2',
      cantidadInicialMostrada: '100 unid.',
      cantidadActualMostrada: '60 unid.',
      estado: 'activo',
    });
  });

  it('orders lotes por fecha_vencimiento ascendente, sin fecha al final', () => {
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

  it('loads el catalogo de productos con productoTerminadoId resuelto en el select de filtro', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    flushProductos([makeProductoDto(), makeProductoDto({ id: 8, producto_terminado: null })]);

    expect(fixture.componentInstance.productoOptions()).toEqual([
      { value: '256', label: 'FR-P3-PR2 · Camote frito' },
    ]);
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    flushProductos();

    fixture.componentInstance.setSearch('camote');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('search') === 'camote')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setProducto('256');
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('producto_terminado_id') === '256')
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
  });

  it('opens and closes the "Agregar lote" modal, reloading on loteRegistrado()', () => {
    const fixture = create();
    flushLotes(expectLotesRequest());
    flushProductos();

    expect(fixture.componentInstance.modalAbierto()).toBe(false);
    fixture.componentInstance.abrirAgregarLote();
    expect(fixture.componentInstance.modalAbierto()).toBe(true);

    fixture.componentInstance.loteRegistrado();
    expect(fixture.componentInstance.modalAbierto()).toBe(false);

    flushLotes(expectLotesRequest());
  });
});
