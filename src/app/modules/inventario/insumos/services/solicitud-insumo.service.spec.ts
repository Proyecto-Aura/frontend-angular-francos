import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { SolicitudInsumoDto } from '../interfaces/solicitud-insumo-dto.interface';
import {
  ResumenSolicitudesInsumo,
  SolicitudInsumo,
} from '../interfaces/solicitud-insumo.interface';
import { SolicitudInsumoService } from './solicitud-insumo.service';

const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;

function makeSolicitudDto(overrides: Partial<SolicitudInsumoDto> = {}): SolicitudInsumoDto {
  return {
    id: 10,
    codigo_solicitud: 'FR-SIN-001-261104',
    solicitud_produccion_id: null,
    estado: 'pendiente',
    fecha_creacion: '2026-11-04T19:30:00.000Z',
    fecha_limite: '2026-11-05',
    solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
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

describe('SolicitudInsumoService (Inventario)', () => {
  let service: SolicitudInsumoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SolicitudInsumoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response, incluyendo el detalle', () => {
    let result: ReturnType<SolicitudInsumoService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service
      .listar(2, 10, {
        search: 'SIN',
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
        request.params.get('search') === 'SIN' &&
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
      codigo: 'FR-SIN-001-261104',
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

  it('fetches los indicadores y renombra entregado/rechazado a completadas/canceladas', () => {
    let result: ResumenSolicitudesInsumo | undefined;
    service.indicadores().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/indicadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ pendiente: 2, en_proceso: 1, entregado: 3, rechazado: 1, total: 7 });

    expect(result!).toEqual({ pendientes: 2, enProceso: 1, completadas: 3, canceladas: 1 });
  });

  it('obtiene una solicitud por id, con su detalle embebido', () => {
    let result: SolicitudInsumo | undefined;
    service.obtener(10).subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10`);
    expect(req.request.method).toBe('GET');
    req.flush(makeSolicitudDto());

    expect(result!).toMatchObject({ id: 10, codigo: 'FR-SIN-001-261104' });
    expect(result!.detalle).toHaveLength(1);
  });

  it('sends el nuevo estado via PATCH .../estado, sin items cuando no se pasan', () => {
    let completed = false;
    service.cambiarEstado(10, 'en_proceso').subscribe(() => (completed = true));

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'en_proceso' });
    req.flush({});

    expect(completed).toBe(true);
  });

  it('sends el estado "entregado" con items (cantidad_entregada por insumo) cuando se pasan', () => {
    let completed = false;
    service
      .cambiarEstado(10, 'entregado', [
        { insumoId: 50, cantidadEntregada: 18 },
        { insumoId: 51, cantidadEntregada: 5 },
      ])
      .subscribe(() => (completed = true));

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      estado: 'entregado',
      items: [
        { insumo_id: 50, cantidad_entregada: 18 },
        { insumo_id: 51, cantidad_entregada: 5 },
      ],
    });
    req.flush({});

    expect(completed).toBe(true);
  });
});
