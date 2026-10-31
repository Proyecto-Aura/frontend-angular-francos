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
    codigo: 'SPR-0090',
    estado: 'pendiente',
    fecha_creacion: '2026-09-12',
    fecha_limite: '2026-09-13',
    solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
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

describe('SolicitudesProduccion', () => {
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
      total:
        (totales.pendientes ?? 0) +
        (totales.enProceso ?? 0) +
        (totales.entregadas ?? 0) +
        (totales.rechazadas ?? 0),
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

  it('maps a row: codigo, cantidadProductos (largo del detalle, no los nombres), fechas y solicitante', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto()],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    expect(fila).toMatchObject({
      codigo: 'SPR-0090',
      cantidadProductos: 1,
      solicitante: 'M. Quispe',
      estado: 'pendiente',
    });
    expect(fila.fechaSolicitudMostrada).toContain('2026');
    expect(fila.fechaLimiteMostrada).toContain('2026');
  });

  it('shows — para fecha limite cuando viene null (opcional en el backend)', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto({ fecha_limite: null })],
    );
    flushResumen();

    expect(fixture.componentInstance.solicitudes()[0].fechaLimiteMostrada).toBe('—');
  });

  it('exposes el resumen (KPIs) con las etiquetas visuales completada/cancelada, mapeadas de entregado/rechazado', () => {
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

    fixture.componentInstance.setEstado('entregado');
    flushPage(expectPageRequest((r) => r.params.get('estado') === 'entregado'));

    fixture.componentInstance.setFecha('2026-09-12');
    flushPage(
      expectPageRequest(
        (r) =>
          r.params.get('fecha_desde') === '2026-09-12' &&
          r.params.get('fecha_hasta') === '2026-09-12',
      ),
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

  it('maps cada estado a su label y tono de badge (entregado/rechazado con las etiquetas pedidas por el usuario)', () => {
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

  it('opens and closes the "Nueva solicitud" modal', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    expect(fixture.componentInstance.modalAbierto()).toBe(false);

    fixture.componentInstance.abrirNuevaSolicitud();
    expect(fixture.componentInstance.modalAbierto()).toBe(true);

    fixture.componentInstance.cerrarForm();
    expect(fixture.componentInstance.modalAbierto()).toBe(false);
  });

  it('closes the modal and reloads the list and the summary when a solicitud is creada', () => {
    const fixture = create();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();

    fixture.componentInstance.abrirNuevaSolicitud();
    fixture.componentInstance.solicitudCreada();

    expect(fixture.componentInstance.modalAbierto()).toBe(false);
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();
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

  it('opens the editar modal solo si la solicitud esta pendiente', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto({ id: 20, estado: 'entregado' })],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    expect(fixture.componentInstance.puedeEditar(fila.solicitud)).toBe(false);

    fixture.componentInstance.editarSolicitud(fila.solicitud);
    expect(fixture.componentInstance.solicitudEditarId()).toBeNull();
  });

  it('cancels a pending solicitud once and reloads the list and indicators', () => {
    const fixture = create();
    flushPage(expectPageRequest(), [makeSolicitudDto()]);
    flushResumen();
    const component = fixture.componentInstance;
    const solicitud = component.solicitudes()[0].solicitud;
    component.cancelarSolicitud(solicitud);
    component.cancelarSolicitud(solicitud);
    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'rechazado' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(component.solicitudes()[0].estado).toBe('rechazado');
    expect(component.cancelandoId()).toBeNull();
    flushPage(expectPageRequest(), [makeSolicitudDto({ estado: 'rechazado' })]);
    flushResumen();
  });

  it('always shows detail and only allows editing and cancellation in pendiente', () => {
    const fixture = create();
    flushPage(expectPageRequest(), [
      makeSolicitudDto({ id: 1, estado: 'pendiente' }),
      makeSolicitudDto({ id: 2, estado: 'en_proceso' }),
      makeSolicitudDto({ id: 3, estado: 'rechazado' }),
      makeSolicitudDto({ id: 4, estado: 'entregado' }),
    ]);
    flushResumen();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('app-ds-icon-button[label="Cancelar solicitud"]').length).toBe(
      1,
    );
    expect(element.querySelectorAll('app-ds-icon-button[label="Editar"]').length).toBe(1);
    expect(element.querySelectorAll('app-ds-icon-button[label="Ver detalle"]').length).toBe(4);
    fixture.componentInstance
      .solicitudes()
      .slice(1)
      .forEach((fila) => fixture.componentInstance.cancelarSolicitud(fila.solicitud));
    httpMock.expectNone((r) => r.method === 'PATCH');
  });

  it('shows cancellation errors and allows retry without changing the row', () => {
    const fixture = create();
    flushPage(expectPageRequest(), [makeSolicitudDto()]);
    flushResumen();
    const component = fixture.componentInstance;
    component.cancelarSolicitud(component.solicitudes()[0].solicitud);
    httpMock
      .expectOne(`${SOLICITUDES_BASE}/10/estado`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    expect(component.errorCancelacion()).toContain('No se pudo cancelar');
    expect(component.cancelandoId()).toBeNull();
    expect(component.solicitudes()[0].estado).toBe('pendiente');
  });

  it('opens the editar modal and reloads the list on solicitudEditada()', () => {
    const fixture = create();
    flushPage(
      expectPageRequest((r) => r.params.get('page') === '1'),
      [makeSolicitudDto({ estado: 'pendiente' })],
    );
    flushResumen();

    const [fila] = fixture.componentInstance.solicitudes();
    expect(fixture.componentInstance.puedeEditar(fila.solicitud)).toBe(true);

    fixture.componentInstance.editarSolicitud(fila.solicitud);
    expect(fixture.componentInstance.solicitudEditarId()).toBe(10);

    fixture.componentInstance.solicitudEditada();
    expect(fixture.componentInstance.solicitudEditarId()).toBeNull();
    flushPage(expectPageRequest((r) => r.params.get('page') === '1'));
    flushResumen();
  });
});
