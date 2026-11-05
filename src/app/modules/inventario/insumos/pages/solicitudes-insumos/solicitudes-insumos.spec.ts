import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { SolicitudInsumoDto } from '../../interfaces/solicitud-insumo-dto.interface';
import { SolicitudesInsumos } from './solicitudes-insumos';

const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;

function makeSolicitudDto(overrides: Partial<SolicitudInsumoDto> = {}): SolicitudInsumoDto {
  return {
    id: 10,
    codigo_solicitud: 'FR-SIN-001-261104',
    solicitud_produccion_id: null,
    estado: 'pendiente',
    fecha_creacion: '2026-11-04T19:30:00.000Z',
    fecha_limite: '2026-11-05',
    solicitado_por: 'uuid-1',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-11-04T19:30:00.000Z',
    updated_at: '2026-11-04T19:30:00.000Z',
    detalle: [
      {
        id: 1,
        insumo_id: 50,
        insumo_sku: 'INS-050',
        insumo_nombre: 'Harina de camote',
        insumo_unidad_medida: 'kg',
        cantidad_solicitada: 20,
        created_at: '2026-11-04T19:30:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('SolicitudesInsumos (Inventario)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<SolicitudesInsumos> {
    const fixture = TestBed.createComponent(SolicitudesInsumos);
    fixture.detectChanges();
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
    data: SolicitudInsumoDto[] = [],
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

  it('maps a row: codigo, insumos, fechas, solicitante y estado', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    expect(fila).toMatchObject({
      codigo: 'FR-SIN-001-261104',
      cantidadInsumos: 1,
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

    fixture.componentInstance.setSearch('FR-SIN');
    flushPage(expectPageRequest((r) => r.params.get('search') === 'FR-SIN'));

    fixture.componentInstance.setEstado('en_proceso');
    flushPage(expectPageRequest((r) => r.params.get('estado') === 'en_proceso'));

    fixture.componentInstance.setFechaDesde('2026-11-01');
    flushPage(expectPageRequest((r) => r.params.get('fecha_desde') === '2026-11-01'));

    fixture.componentInstance.setFechaHasta('2026-11-04');
    flushPage(expectPageRequest((r) => r.params.get('fecha_hasta') === '2026-11-04'));
  });

  it('does not request anything when the date range is inverted', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    fixture.componentInstance.setFechaDesde('2026-11-20');
    flushPage(expectPageRequest((r) => r.params.get('fecha_desde') === '2026-11-20'));

    fixture.componentInstance.setFechaHasta('2026-11-01');

    expect(fixture.componentInstance.rangoInvalido()).toBe(true);
    httpMock.expectNone(
      (r) => r.url === SOLICITUDES_BASE && r.params.get('fecha_hasta') === '2026-11-01',
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

  it('opens the detalle modal in modo "ver" with the id of the fila clickeada and closes it on cerrarDetalle()', () => {
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
    expect(fixture.componentInstance.modalModo()).toBe('ver');

    fixture.componentInstance.cerrarDetalle();
    expect(fixture.componentInstance.solicitudDetalleId()).toBeNull();
  });

  it('abrirEntrega opens the same modal pero en modo "entregar"', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto({ estado: 'en_proceso' })],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.abrirEntrega(fila.solicitud);

    expect(fixture.componentInstance.solicitudDetalleId()).toBe(10);
    expect(fixture.componentInstance.modalModo()).toBe('entregar');
  });

  it('accionSiguiente refleja la maquina de estados por rol inventario', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    const component = fixture.componentInstance;
    expect(component.accionSiguiente('pendiente')).toBe('Iniciar entrega');
    expect(component.accionSiguiente('en_proceso')).toBe('Marcar entregado');
    expect(component.accionSiguiente('entregado')).toBeNull();
    expect(component.accionSiguiente('rechazado')).toBeNull();
  });

  it('avanzarEstado desde "pendiente" hace PATCH .../estado directo y recarga la lista', () => {
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

  it('avanzarEstado desde "en_proceso" abre el modal en modo "entregar" en vez de hacer PATCH directo', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto({ estado: 'en_proceso' })],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.avanzarEstado(fila.solicitud);

    expect(fixture.componentInstance.solicitudDetalleId()).toBe(10);
    expect(fixture.componentInstance.modalModo()).toBe('entregar');
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

  it('puedeCancelar solo permite cancelar desde pendiente', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    const component = fixture.componentInstance;
    expect(component.puedeCancelar('pendiente')).toBe(true);
    expect(component.puedeCancelar('en_proceso')).toBe(false);
    expect(component.puedeCancelar('entregado')).toBe(false);
    expect(component.puedeCancelar('rechazado')).toBe(false);
  });

  it('cancelarSolicitud hace PATCH .../estado con rechazado y recarga la lista', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.cancelarSolicitud(fila.solicitud);

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'rechazado' });
    req.flush({});

    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();
  });

  it('cancelarSolicitud no hace nada si la solicitud ya no esta pendiente', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto({ estado: 'en_proceso' })],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    fixture.componentInstance.cancelarSolicitud(fila.solicitud);

    httpMock.expectNone(`${SOLICITUDES_BASE}/10/estado`);
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
