import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { MovimientoProductoTerminadoDto } from '../../interfaces/movimiento-producto-terminado-dto.interface';
import { HistorialMovimientosProductoTerminado } from './historial-movimientos-producto-terminado';

const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-producto-terminado`;

function makeMovimientoDto(
  overrides: Partial<MovimientoProductoTerminadoDto> = {},
): MovimientoProductoTerminadoDto {
  return {
    id: 1,
    codigo: 'FR-MVP-001-261022-PT256',
    lote_producto_terminado_id: 1,
    codigo_lote: 'FR-LTP-001',
    producto_terminado_id: 256,
    sku: 'DEMO-MOV-PT-001',
    producto_id: 3,
    producto_nombre: 'Pan de molde',
    categoria_id: 2,
    categoria_nombre: 'Panadería',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    tipo: 'entrada',
    cantidad: 100,
    stock_anterior: 170,
    stock_resultante: 270,
    razon: 'Producción del día',
    fecha: '2026-10-22T16:40:00.000Z',
    created_at: '2026-10-22T16:40:00.000Z',
    ...overrides,
  };
}

describe('HistorialMovimientosProductoTerminado', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<HistorialMovimientosProductoTerminado> {
    const fixture = TestBed.createComponent(HistorialMovimientosProductoTerminado);
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
    data: MovimientoProductoTerminadoDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({ data, meta: { total, page, limit, total_pages: totalPages } });
  }

  it('opens movement details with motive and lot, without a responsible field', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeMovimientoDto({ tipo: 'salida', cantidad: 20 })]);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.columnas().some((c) => c.key === 'razon')).toBe(false);
    const element: HTMLElement = fixture.nativeElement;
    element
      .querySelector<HTMLButtonElement>('app-ds-icon-button[label="Ver detalle"] button')!
      .click();
    fixture.detectChanges();
    expect(component.movimientoDetalle()?.codigoLote).toBe('FR-LTP-001');
    expect(component.camposDetalle()).toContainEqual({
      label: 'Motivo',
      value: 'Producción del día',
    });
    expect(component.camposDetalle()).toContainEqual({ label: 'Cantidad', value: '-20 unid.' });
    expect(component.camposDetalle().some((c) => c.label === 'Responsable')).toBe(false);
    expect(element.textContent).toContain('FR-LTP-001');
    component.cerrarDetalle();
    expect(component.movimientoDetalle()).toBeNull();
  });

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

  it('maps a movimiento row: fecha/hora split, producto, razon fallback a —, sin sufijo de unidad', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makeMovimientoDto({ razon: '' })]);

    const [fila] = fixture.componentInstance.movimientos();
    expect(fila).toMatchObject({
      codigo: 'FR-MVP-001-261022-PT256',
      productoNombre: 'Pan de molde',
      sku: 'DEMO-MOV-PT-001',
      tipo: 'entrada',
      cantidad: 100,
      cantidadMostrada: '+100 unid.',
      stockAnteriorMostrado: '170 unid.',
      stockResultanteMostrado: '270 unid.',
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
    expect(entrada.cantidadMostrada).toBe('+100 unid.');
    expect(salida.cantidadMostrada).toBe('-40 unid.');
    expect(ajuste.cantidadMostrada).toBe('-15 unid.');
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));

    fixture.componentInstance.setSearch('pan');
    httpMock
      .expectOne((r) => r.url === MOVIMIENTOS_BASE && r.params.get('search') === 'pan')
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
