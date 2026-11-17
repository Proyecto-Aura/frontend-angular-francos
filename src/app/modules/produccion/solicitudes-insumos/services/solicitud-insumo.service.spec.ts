import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { environment } from '../../../../../environments/environment';
import { SolicitudInsumoDto } from '../interfaces/solicitud-insumo-dto.interface';
import {
  ResumenSolicitudesInsumo,
  SolicitudInsumo,
  SolicitudInsumoForm,
} from '../interfaces/solicitud-insumo.interface';
import { SolicitudInsumoService } from './solicitud-insumo.service';

const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;

function makeSolicitudDto(overrides: Partial<SolicitudInsumoDto> = {}): SolicitudInsumoDto {
  return {
    id: 10,
    codigo_solicitud: 'FR-SIN-090-261104',
    solicitud_produccion_id: null,
    estado: 'pendiente',
    fecha_creacion: '2026-11-04',
    fecha_limite: '2026-11-15',
    solicitado_por: 'uuid-1',
    solicitado_por_nombre: 'Admin Sistema',
    created_at: '2026-11-04T00:00:00.000Z',
    updated_at: '2026-11-04T00:00:00.000Z',
    detalle: [
      {
        id: 1,
        insumo_id: 12,
        insumo_sku: 'FR-INS-012',
        insumo_nombre: 'Harina de trigo',
        insumo_unidad_medida: 'kg',
        cantidad_solicitada: 50,
        created_at: '2026-11-04T00:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('SolicitudInsumoService (Produccion)', () => {
  let service: SolicitudInsumoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SolicitudInsumoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lists a requested page and maps the response, incluyendo el detalle', () => {
    let result: ReturnType<SolicitudInsumoService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service
      .listar(2, 10, {
        search: 'FR-SIN',
        estado: 'pendiente',
        fechaDesde: '2026-11-01',
        fechaHasta: '2026-11-30',
      })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === SOLICITUDES_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('search') === 'FR-SIN' &&
        request.params.get('estado') === 'pendiente' &&
        request.params.get('fecha_desde') === '2026-11-01' &&
        request.params.get('fecha_hasta') === '2026-11-30',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeSolicitudDto()],
      meta: { total: 6, page: 2, limit: 10, total_pages: 1 },
    });

    expect(result!).toMatchObject({ total: 6, pagina: 2, totalPaginas: 1 });
    expect(result!.solicitudes[0]).toMatchObject({
      codigo: 'FR-SIN-090-261104',
      estado: 'pendiente',
    });
    expect(result!.solicitudes[0].detalle).toHaveLength(1);
  });

  it('omits empty filters from the query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === SOLICITUDES_BASE &&
        !request.params.has('search') &&
        !request.params.has('estado') &&
        !request.params.has('fecha_desde') &&
        !request.params.has('fecha_hasta'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('pide a HOY via fecha_desde/fecha_hasta (no filtra fecha_creacion en el cliente) y usa el maximo devuelto', () => {
    // No se filtra fecha_creacion contra "hoy" en el cliente a proposito
    // (bug real encontrado por el backend: fecha_creacion se guardaba con
    // la fecha UTC del server, no la de Lima) — se le pide directo al
    // backend via fecha_desde/fecha_hasta, que el resuelve en zona Lima.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 4, 23));
    let siguiente: number | undefined;
    service.siguienteSecuencial().subscribe((v) => (siguiente = v));

    const req = httpMock.expectOne(
      (request) =>
        request.url === SOLICITUDES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100' &&
        request.params.get('fecha_desde') === '2026-11-04' &&
        request.params.get('fecha_hasta') === '2026-11-04',
    );
    req.flush({
      data: [makeSolicitudDto({ codigo_solicitud: 'FR-SIN-005-261104' })],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    expect(siguiente).toBe(6);
  });

  it('fetches los indicadores y renombra entregado/rechazado a completadas/canceladas', () => {
    let result: ResumenSolicitudesInsumo | undefined;
    service.indicadores().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/indicadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ pendiente: 2, en_proceso: 1, entregado: 3, rechazado: 1, total: 7 });

    expect(result!).toEqual({
      pendientes: 2,
      enProceso: 1,
      completadas: 3,
      canceladas: 1,
    });
  });

  it('registers a solicitud, sending codigo_solicitud + detalle mapeado a insumo_id/cantidad_solicitada', () => {
    const form: SolicitudInsumoForm = {
      fechaLimite: '2026-11-15',
      filas: [{ id: 1, insumoId: '12', cantidadSolicitada: '50' }],
    };
    let result: SolicitudInsumo | undefined;
    service.registrar('FR-SIN-091-261104', form).subscribe((r) => (result = r));

    const req = httpMock.expectOne(SOLICITUDES_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      codigo_solicitud: 'FR-SIN-091-261104',
      fecha_limite: '2026-11-15',
      detalle: [{ insumo_id: 12, cantidad_solicitada: 50 }],
    });
    req.flush(makeSolicitudDto({ codigo_solicitud: 'FR-SIN-091-261104' }));

    expect(result!).toMatchObject({ codigo: 'FR-SIN-091-261104' });
  });

  it('registra incluyendo solicitud_produccion_id cuando se pasa', () => {
    const form: SolicitudInsumoForm = {
      fechaLimite: '2026-11-15',
      filas: [{ id: 1, insumoId: '12', cantidadSolicitada: '50' }],
    };
    service.registrar('FR-SIN-091-261104', form, 6).subscribe();

    const req = httpMock.expectOne(SOLICITUDES_BASE);
    expect(req.request.body).toMatchObject({ solicitud_produccion_id: 6 });
    req.flush(makeSolicitudDto());
  });

  it('obtiene el detalle de una solicitud', () => {
    let result: SolicitudInsumo | undefined;
    service.obtener(10).subscribe((r) => (result = r));

    httpMock.expectOne(`${SOLICITUDES_BASE}/10`).flush(makeSolicitudDto());
    expect(result!).toMatchObject({ id: 10, codigo: 'FR-SIN-090-261104' });
  });

  it('cambiarEstado hace PATCH .../estado con el estado pedido', () => {
    service.cambiarEstado(10, 'en_proceso').subscribe();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'en_proceso' });
    req.flush({});
  });

  it('cancelar hace PATCH .../estado con rechazado', () => {
    service.cancelar(10).subscribe();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.body).toEqual({ estado: 'rechazado' });
    req.flush({});
  });

  it('actualizarFechaLimite hace PATCH .../:id con fecha_limite', () => {
    service.actualizarFechaLimite(10, '2026-11-20').subscribe();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ fecha_limite: '2026-11-20' });
    req.flush({});
  });

  it('agregarDetalle hace POST .../:id/detalle', () => {
    service.agregarDetalle(10, { insumo_id: 13, cantidad_solicitada: 15 }).subscribe();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/detalle`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ insumo_id: 13, cantidad_solicitada: 15 });
    req.flush({});
  });

  it('actualizarCantidadDetalle hace PATCH .../detalle/:detalleId', () => {
    service.actualizarCantidadDetalle(1, 80).subscribe();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/detalle/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ cantidad_solicitada: 80 });
    req.flush({});
  });

  it('eliminarDetalle hace DELETE .../detalle/:detalleId', () => {
    service.eliminarDetalle(1).subscribe();

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/detalle/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
