import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PedidoPrepararResumenDto } from '../../interfaces/pedido-preparar-dto.interface';
import { PedidosPorPreparar } from './pedidos-por-preparar';

const PEDIDOS_PREPARAR_BASE = `${environment.apiUrl}/inventario/pedidos`;

function makeResumenDto(
  overrides: Partial<PedidoPrepararResumenDto> = {},
): PedidoPrepararResumenDto {
  return {
    id: 1042,
    codigo: 'PED-001042',
    cliente: { id: 'uuid-1', nombre: 'Supermercados Andina' },
    metodo_pago: 'efectivo',
    total: '1250.50',
    tipo_entrega: 'delivery',
    estado: 'en_espera_inventario',
    origen: 'portal',
    productos: 3,
    unidades: 210,
    fecha_entrega: null,
    created_at: '2026-09-12T09:05:00.000Z',
    ...overrides,
  };
}

describe('PedidosPorPreparar', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<PedidosPorPreparar> {
    const fixture = TestBed.createComponent(PedidosPorPreparar);
    fixture.detectChanges();
    return fixture;
  }

  function expectPageRequest(
    extra: (request: TestRequest['request']) => boolean = () => true,
  ): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === PEDIDOS_PREPARAR_BASE &&
        request.params.get('limit') === '10' &&
        extra(request),
    );
  }

  function flushPage(
    req: TestRequest,
    data: PedidoPrepararResumenDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({ data, meta: { total, page, limit, total_pages: totalPages } });
  }

  function expectIndicadoresRequest(): TestRequest {
    return httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/indicadores`);
  }

  function flushResumen(
    totales: { enEspera?: number; enPreparacion?: number; pendienteEntrega?: number } = {},
  ): void {
    expectIndicadoresRequest().flush({
      en_espera_inventario: totales.enEspera ?? 0,
      en_preparacion: totales.enPreparacion ?? 0,
      pendiente_entrega: totales.pendienteEntrega ?? 0,
    });
  }

  it('requests page 1 y los indicadores on init', () => {
    const fixture = create();

    const pageReq = expectPageRequest(
      (r) => r.params.get('page') === '1' && r.params.get('limit') === '10',
    );
    expect(pageReq.request.method).toBe('GET');
    flushPage(pageReq);
    flushResumen();

    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('maps a row: codigo, cliente, productos/unidades y estado', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeResumenDto()],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.pedidos();
    expect(fila).toMatchObject({
      codigo: 'PED-001042',
      cliente: 'Supermercados Andina',
      cantidadProductos: 3,
      cantidadUnidades: 210,
      estado: 'en_espera_inventario',
    });
    expect(fila.fechaMostrada).toContain('2026');
    expect(fila.horaMostrada).toMatch(/\d{2}:\d{2}/);
  });

  it('exposes el resumen (KPIs) de los 3 estados', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen({ enEspera: 2, enPreparacion: 1, pendienteEntrega: 1 });

    expect(fixture.componentInstance.resumen()).toEqual({
      enEsperaInventario: 2,
      enPreparacion: 1,
      pendienteEntrega: 1,
    });
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    fixture.componentInstance.setSearch('andina');
    flushPage(expectPageRequest((r) => r.params.get('search') === 'andina'));

    fixture.componentInstance.setEstado('en_preparacion');
    flushPage(expectPageRequest((r) => r.params.get('estado') === 'en_preparacion'));

    fixture.componentInstance.setFechaDesde('2026-09-12');
    flushPage(
      expectPageRequest(
        (r) => r.params.get('fecha_desde') === '2026-09-12' && !r.params.has('fecha_hasta'),
      ),
    );
    fixture.componentInstance.setFechaHasta('2026-09-15');
    flushPage(
      expectPageRequest(
        (r) =>
          r.params.get('fecha_hasta') === '2026-09-15' &&
          r.params.get('fecha_desde') === '2026-09-12',
      ),
    );
  });

  it('does not request inverted ranges and recovers when clearing a boundary', () => {
    const fixture = create();
    flushPage(expectPageRequest());
    flushResumen();
    fixture.componentInstance.setFechaHasta('2026-09-12');
    flushPage(expectPageRequest((r) => r.params.get('fecha_hasta') === '2026-09-12'));
    fixture.componentInstance.setFechaDesde('2026-09-15');
    expect(fixture.componentInstance.rangoInvalido()).toBe(true);
    httpMock.expectNone((r) => r.url === PEDIDOS_PREPARAR_BASE);
    fixture.componentInstance.setFechaHasta('');
    expect(fixture.componentInstance.rangoInvalido()).toBe(false);
    flushPage(
      expectPageRequest(
        (r) => r.params.get('fecha_desde') === '2026-09-15' && !r.params.has('fecha_hasta'),
      ),
    );
  });

  it('ignores page changes outside the available range', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeResumenDto()],
      1,
      10,
      21,
      3,
    );
    flushResumen();

    fixture.componentInstance.cambiarPagina(0);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(1);

    httpMock.expectNone((r) => r.url === PEDIDOS_PREPARAR_BASE && r.params.get('page') !== '1');
  });

  it('shows an error state with retry when the pedidos request fails', () => {
    const fixture = create();
    expectPageRequest((r) => r.params.get('page') === '1').flush('error', {
      status: 500,
      statusText: 'Server Error',
    });
    flushResumen();

    expect(fixture.componentInstance.errorCarga()).toBe(true);
  });

  it('falls back to a cleared summary when the indicadores request fails', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    expectIndicadoresRequest().flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.resumen()).toEqual({
      enEsperaInventario: 0,
      enPreparacion: 0,
      pendienteEntrega: 0,
    });
  });

  it('maps cada estado a su label y tono de badge', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    const component = fixture.componentInstance;
    expect(component.estadoLabel('en_espera_inventario')).toBe('En espera de inventario');
    expect(component.estadoTone('en_espera_inventario')).toBe('warning');
    expect(component.estadoLabel('en_preparacion')).toBe('En preparación');
    expect(component.estadoTone('en_preparacion')).toBe('info');
    expect(component.estadoLabel('pendiente_entrega')).toBe('Pendiente a entrega');
    expect(component.estadoTone('pendiente_entrega')).toBe('success');
  });

  it('opens the detalle modal with the id of the fila clickeada and closes it on cerrarDetalle()', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeResumenDto()],
    );
    flushResumen();

    expect(fixture.componentInstance.pedidoDetalleId()).toBeNull();

    const [fila] = fixture.componentInstance.pedidos();
    fixture.componentInstance.verDetalle(fila.pedido);
    expect(fixture.componentInstance.pedidoDetalleId()).toBe(1042);

    fixture.componentInstance.cerrarDetalle();
    expect(fixture.componentInstance.pedidoDetalleId()).toBeNull();
  });

  it('reloads the list and the summary when pedidoActualizado() fires', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    fixture.componentInstance.pedidoActualizado();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();
  });
});
