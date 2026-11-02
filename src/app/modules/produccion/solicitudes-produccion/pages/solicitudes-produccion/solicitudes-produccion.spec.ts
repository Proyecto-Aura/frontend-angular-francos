import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { SolicitudProduccionDto } from '../../interfaces/solicitud-produccion-dto.interface';
import { SolicitudesProduccion } from './solicitudes-produccion';

const SOLICITUDES_BASE = `${environment.apiUrl}/solicitudes-produccion`;

function makeSolicitudDto(overrides: Partial<SolicitudProduccionDto> = {}): SolicitudProduccionDto {
  return {
    id: 10,
    codigo: 'FR-SPR-090-260912',
    estado: 'pendiente',
    fecha_creacion: '2026-09-12',
    fecha_limite: '2026-09-13',
    solicitado_por: 'uuid-1',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-09-12T00:00:00.000Z',
    updated_at: '2026-09-12T00:00:00.000Z',
    detalle: [
      {
        id: 1,
        solicitud_produccion_id: 10,
        producto_terminado_id: 256,
        sku: 'FR-P3-PR2',
        producto_id: 3,
        producto_nombre: 'Camote frito',
        categoria_id: 2,
        categoria_nombre: 'Snacks',
        presentacion_id: 2,
        presentacion_cantidad: 500,
        presentacion_unidad_medida: 'gr',
        cantidad_solicitada: 20,
        created_at: '2026-09-12T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('SolicitudesProduccion (Produccion)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<SolicitudesProduccion> {
    const fixture = TestBed.createComponent(SolicitudesProduccion);
    fixture.detectChanges();
    httpMock
      .expectOne(
        (r) =>
          r.url === `${environment.apiUrl}/lotes-producto-terminado` &&
          r.params.get('limit') === '1',
      )
      .flush({ data: [], meta: { total: 9, page: 1, limit: 1, total_pages: 9 } });
    return fixture;
  }

  function expectPageRequest(
    extra: (request: TestRequest['request']) => boolean = () => true,
  ): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === SOLICITUDES_BASE && request.params.get('limit') === '10' && extra(request),
    );
  }

  function flushPage(
    req: TestRequest,
    data: SolicitudProduccionDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({ data, meta: { total, page, limit, total_pages: totalPages } });
  }

  function expectIndicadoresRequest(): TestRequest {
    return httpMock.expectOne(`${SOLICITUDES_BASE}/indicadores`);
  }

  function flushResumen(
    totales: {
      pendientes?: number;
      enProceso?: number;
      entregadas?: number;
      rechazadas?: number;
    } = {},
  ): void {
    expectIndicadoresRequest().flush({
      pendiente: totales.pendientes ?? 0,
      en_proceso: totales.enProceso ?? 0,
      entregado: totales.entregadas ?? 0,
      rechazado: totales.rechazadas ?? 0,
      total: 0,
    });
  }

  it('shows global tab counts from the API instead of the filtered page', () => {
    const fixture = create();
    flushPage(expectPageRequest(), [], 1, 10, 1);
    flushResumen({ pendientes: 2, enProceso: 3, entregadas: 4, rechazadas: 1 });
    expect(fixture.componentInstance.tabs().find((t) => t.id === 'solicitudes')?.count).toBe(10);
    expect(fixture.componentInstance.tabs().find((t) => t.id === 'lote')?.count).toBe(9);
  });

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

  it('maps a row: codigo, productos, fechas, solicitante y estado', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    expect(fila).toMatchObject({
      codigo: 'FR-SPR-090-260912',
      cantidadProductos: 1,
      solicitante: 'M. Quispe',
      estado: 'pendiente',
    });
  });

  it('exposes el resumen (KPIs) de los 4 estados', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen({ pendientes: 2, enProceso: 1, entregadas: 3, rechazadas: 1 });

    expect(fixture.componentInstance.resumen()).toEqual({
      pendientes: 2,
      enProceso: 1,
      completadas: 3,
      canceladas: 1,
    });
  });

  it('resets to page 1 and sends the right query params on each filter change', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    fixture.componentInstance.setSearch('camote');
    flushPage(expectPageRequest((r) => r.params.get('search') === 'camote'));

    fixture.componentInstance.setEstado('en_proceso');
    flushPage(expectPageRequest((r) => r.params.get('estado') === 'en_proceso'));

    fixture.componentInstance.setFechaDesde('2026-09-01');
    flushPage(expectPageRequest((r) => r.params.get('fecha_desde') === '2026-09-01'));

    fixture.componentInstance.setFechaHasta('2026-09-12');
    flushPage(expectPageRequest((r) => r.params.get('fecha_hasta') === '2026-09-12'));
  });

  it('does not request anything when the date range is inverted', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    fixture.componentInstance.setFechaDesde('2026-09-20');
    flushPage(expectPageRequest((r) => r.params.get('fecha_desde') === '2026-09-20'));

    fixture.componentInstance.setFechaHasta('2026-09-01');

    expect(fixture.componentInstance.rangoInvalido()).toBe(true);
    httpMock.expectNone(
      (r) => r.url === SOLICITUDES_BASE && r.params.get('fecha_hasta') === '2026-09-01',
    );
  });

  it('ignores page changes outside the available range', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
      1,
      10,
      21,
      3,
    );
    flushResumen();

    fixture.componentInstance.cambiarPagina(0);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(1);

    httpMock.expectNone((r) => r.url === SOLICITUDES_BASE && r.params.get('page') !== '1');
  });

  it('shows an error state with retry when the solicitudes request fails', () => {
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
      pendientes: 0,
      enProceso: 0,
      completadas: 0,
      canceladas: 0,
    });
  });

  it('opens the detalle modal with the id of the fila clickeada and closes it on cerrarDetalle()', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
    );
    flushResumen();

    expect(fixture.componentInstance.solicitudDetalleId()).toBeNull();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.verDetalle(fila.solicitud);
    expect(fixture.componentInstance.solicitudDetalleId()).toBe(10);

    fixture.componentInstance.cerrarDetalle();
    expect(fixture.componentInstance.solicitudDetalleId()).toBeNull();
  });

  it('accionSiguiente/puedeRechazar reflejan la maquina de estados por rol produccion', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    const component = fixture.componentInstance;
    expect(component.accionSiguiente('pendiente')).toBe('Iniciar producción');
    expect(component.puedeRechazar('pendiente')).toBe(true);
    expect(component.accionSiguiente('en_proceso')).toBe('Marcar entregado');
    expect(component.puedeRechazar('en_proceso')).toBe(false);
    expect(component.accionSiguiente('entregado')).toBeNull();
    expect(component.accionSiguiente('rechazado')).toBeNull();
  });

  it('avanzarEstado hace PATCH .../estado con el siguiente estado y recarga la lista', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.avanzarEstado(fila.solicitud);

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'en_proceso' });
    req.flush({});

    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();
  });

  it('rechazarSolicitud hace PATCH .../estado con rechazado', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.rechazarSolicitud(fila.solicitud);

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.body).toEqual({ estado: 'rechazado' });
    req.flush({});

    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();
  });

  it('rechazarSolicitud no hace nada si la solicitud ya no esta pendiente', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto({ estado: 'en_proceso' })],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.rechazarSolicitud(fila.solicitud);

    httpMock.expectNone(`${SOLICITUDES_BASE}/10/estado`);
  });

  it('shows a conflict message on 409 y recarga la lista', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.avanzarEstado(fila.solicitud);

    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10/estado`)
      .flush('conflict', { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorCambioEstado()).toContain('ya cambió de estado');

    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();
  });

  it('starts on the "solicitudes" tab and switches to "lote" via cambiarTab()', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    expect(fixture.componentInstance.activeTab()).toBe('solicitudes');

    fixture.componentInstance.cambiarTab('lote');
    expect(fixture.componentInstance.activeTab()).toBe('lote');

    fixture.componentInstance.cambiarTab('otro-id-cualquiera');
    expect(fixture.componentInstance.activeTab()).toBe('solicitudes');
  });

  it('maps cada estado a su label y tono de badge', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    const component = fixture.componentInstance;
    expect(component.estadoLabel('pendiente')).toBe('Pendiente');
    expect(component.estadoTone('pendiente')).toBe('warning');
    expect(component.estadoLabel('en_proceso')).toBe('En proceso');
    expect(component.estadoTone('en_proceso')).toBe('info');
    expect(component.estadoLabel('entregado')).toBe('Entregado');
    expect(component.estadoTone('entregado')).toBe('success');
    expect(component.estadoLabel('rechazado')).toBe('Rechazado');
    expect(component.estadoTone('rechazado')).toBe('danger');
  });
});
