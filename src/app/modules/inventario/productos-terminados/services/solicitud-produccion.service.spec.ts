import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { SolicitudProduccionDto } from '../interfaces/solicitud-produccion-dto.interface';
import {
  ResumenSolicitudesProduccion,
  SolicitudProduccion,
  SolicitudProduccionForm,
} from '../interfaces/solicitud-produccion.interface';
import { SolicitudProduccionService } from './solicitud-produccion.service';

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

describe('SolicitudProduccionService', () => {
  let service: SolicitudProduccionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SolicitudProduccionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response, incluyendo el detalle', () => {
    let result: ReturnType<SolicitudProduccionService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service
      .listar(2, 10, {
        search: 'SPR',
        estado: 'pendiente',
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
      })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === SOLICITUDES_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('search') === 'SPR' &&
        request.params.get('estado') === 'pendiente' &&
        request.params.get('fecha_desde') === '2026-09-01' &&
        request.params.get('fecha_hasta') === '2026-09-30',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeSolicitudDto()],
      meta: { total: 6, page: 2, limit: 10, total_pages: 1 },
    });

    expect(result!).toMatchObject({ total: 6, pagina: 2, totalPaginas: 1 });
    expect(result!.solicitudes[0]).toMatchObject({ codigo: 'SPR-0090', estado: 'pendiente' });
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

  it('computes el proximo secuencial a partir de las solicitudes de hoy', () => {
    let siguiente: number | undefined;
    service.siguienteSecuencial().subscribe((v) => (siguiente = v));

    const req = httpMock.expectOne(
      (request) =>
        request.url === SOLICITUDES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
    const hoyIso = new Date().toISOString().slice(0, 10);
    req.flush({
      data: [makeSolicitudDto({ codigo: 'FR-SPR-005-260101', fecha_creacion: hoyIso })],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    expect(siguiente).toBe(6);
  });

  it('fetches los indicadores y renombra entregado/rechazado a completadas/canceladas', () => {
    let result: ResumenSolicitudesProduccion | undefined;
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

  it('registers a solicitud, sending codigo + detalle mapeado a producto_terminado_id/cantidad_solicitada', () => {
    const form: SolicitudProduccionForm = {
      fechaLimite: '2026-09-20',
      filas: [{ id: 1, productoTerminadoId: '256', cantidadSolicitada: '20' }],
    };
    let result: SolicitudProduccion | undefined;
    service.registrar('SPR-0091', form).subscribe((r) => (result = r));

    const req = httpMock.expectOne(SOLICITUDES_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      codigo: 'SPR-0091',
      fecha_limite: '2026-09-20',
      detalle: [{ producto_terminado_id: 256, cantidad_solicitada: 20 }],
    });
    req.flush(makeSolicitudDto({ codigo: 'SPR-0091' }));

    expect(result!).toMatchObject({ codigo: 'SPR-0091' });
  });
});
