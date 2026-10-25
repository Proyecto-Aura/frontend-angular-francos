import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { MovimientoInsumoDto } from '../../interfaces/movimiento-insumo-dto.interface';
import { HistorialMovimientosInsumo } from './historial-movimientos-insumo';

const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-insumo`;

function makeMovimientoDto(overrides: Partial<MovimientoInsumoDto> = {}): MovimientoInsumoDto {
  return {
    id: 1,
    codigo: 'FR-MV-001-261022-INS9',
    lote_insumo_id: 1,
    codigo_lote: 'FR-LT-001',
    insumo_id: 9,
    insumo_nombre: 'Harina de trigo',
    insumo_sku: 'FR-INS-9',
    insumo_unidad_medida: 'kg',
    tipo: 'entrada',
    cantidad: 100,
    stock_anterior: 170,
    stock_resultante: 270,
    razon: 'Ingreso de lote',
    fecha: '2026-10-22T16:40:00.000Z',
    created_at: '2026-10-22T16:40:00.000Z',
    ...overrides,
  };
}

describe('HistorialMovimientosInsumo', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<HistorialMovimientosInsumo> {
    const fixture = TestBed.createComponent(HistorialMovimientosInsumo);
    fixture.detectChanges();
    return fixture;
  }

  function expectPageRequest(page: number, limit: number): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === MOVIMIENTOS_BASE &&
        request.params.get('page') === String(page) &&
        request.params.get('limit') === String(limit),
    );
  }

  function flushPage(
    req: TestRequest,
    data: MovimientoInsumoDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({ data, meta: { total, page, limit, total_pages: totalPages } });
  }

  it('requests the first page on init, with no filters', () => {
    const fixture = create();
    const req = expectPageRequest(1, 10);

    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('tipo')).toBe(false);
    expect(req.request.params.has('fecha_desde')).toBe(false);
    expect(req.request.params.has('fecha_hasta')).toBe(false);

    flushPage(req);
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('maps a movimiento row: fecha/hora split, insumo, razon fallback a —', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeMovimientoDto({ razon: '' })]);

    const [fila] = fixture.componentInstance.movimientos();
    expect(fila).toMatchObject({
      codigo: 'FR-MV-001-261022-INS9',
      insumoNombre: 'Harina de trigo',
      insumoSku: 'FR-INS-9',
      tipo: 'entrada',
      cantidad: 100,
      cantidadMostrada: '+100 kg',
      stockAnteriorMostrado: '170 kg',
      stockResultanteMostrado: '270 kg',
      razon: '—',
    });
    expect(fila.fechaMostrada).toContain('2026');
    expect(fila.horaMostrada).toMatch(/^\d{2}:\d{2}$/);
  });

  it('resolves cantidad con signo segun tipo: positiva en entrada, negativa en salida, tal cual en ajuste', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [
      makeMovimientoDto({ id: 1, tipo: 'entrada', cantidad: 100 }),
      makeMovimientoDto({ id: 2, tipo: 'salida', cantidad: 40 }),
      makeMovimientoDto({ id: 3, tipo: 'ajuste', cantidad: -15 }),
    ]);

    const [entrada, salida, ajuste] = fixture.componentInstance.movimientos();
    expect(entrada.cantidadMostrada).toBe('+100 kg');
    expect(salida.cantidadMostrada).toBe('-40 kg');
    expect(ajuste.cantidadMostrada).toBe('-15 kg');
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));

    fixture.componentInstance.setSearch('harina');
    httpMock
      .expectOne((r) => r.url === MOVIMIENTOS_BASE && r.params.get('search') === 'harina')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setTipo('salida');
    httpMock
      .expectOne((r) => r.url === MOVIMIENTOS_BASE && r.params.get('tipo') === 'salida')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setFechaDesde('2026-10-01');
    httpMock
      .expectOne((r) => r.url === MOVIMIENTOS_BASE && r.params.get('fecha_desde') === '2026-10-01')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setFechaHasta('2026-10-31');
    httpMock
      .expectOne((r) => r.url === MOVIMIENTOS_BASE && r.params.get('fecha_hasta') === '2026-10-31')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('does not call the backend when fecha desde es posterior a fecha hasta', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));

    fixture.componentInstance.setFechaDesde('2026-10-31');
    httpMock
      .expectOne((r) => r.url === MOVIMIENTOS_BASE && r.params.get('fecha_desde') === '2026-10-31')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });

    fixture.componentInstance.setFechaHasta('2026-10-01');

    expect(fixture.componentInstance.rangoInvalido()).toBe(true);
    httpMock.expectNone(
      (r) => r.url === MOVIMIENTOS_BASE && r.params.get('fecha_hasta') === '2026-10-01',
    );
  });

  it('ignores page changes outside the available range', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeMovimientoDto()], 1, 10, 21, 3);

    fixture.componentInstance.cambiarPagina(0);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(1);

    httpMock.expectNone(MOVIMIENTOS_BASE);
  });

  it('shows an error state with retry when the request fails', () => {
    const fixture = create();
    expectPageRequest(1, 10).flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.errorCarga()).toBe(true);

    fixture.componentInstance.cargarMovimientos();
    flushPage(expectPageRequest(1, 10));

    expect(fixture.componentInstance.errorCarga()).toBe(false);
  });
});
