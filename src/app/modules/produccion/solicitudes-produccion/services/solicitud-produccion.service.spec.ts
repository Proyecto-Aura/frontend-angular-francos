import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { SolicitudProduccionDto } from '../interfaces/solicitud-produccion-dto.interface';
import { SolicitudProduccionService } from './solicitud-produccion.service';

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
    detalle: [],
    ...overrides,
  };
}

describe('SolicitudProduccionService (Produccion)', () => {
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

  it('lista una pagina con los filtros como query params', () => {
    let result: unknown;
    service
      .listar(2, 10, {
        search: 'FR-SPR',
        estado: 'en_proceso',
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-12',
      })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === SOLICITUDES_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('search') === 'FR-SPR' &&
        request.params.get('estado') === 'en_proceso' &&
        request.params.get('fecha_desde') === '2026-09-01' &&
        request.params.get('fecha_hasta') === '2026-09-12',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeSolicitudDto()],
      meta: { total: 1, page: 2, limit: 10, total_pages: 1 },
    });

    expect(result).toMatchObject({ total: 1, pagina: 2, totalPaginas: 1 });
  });

  it('omite los filtros vacios de los query params', () => {
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

  it('pide los indicadores de los 4 estados', () => {
    let resumen: unknown;
    service.indicadores().subscribe((r) => (resumen = r));

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/indicadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ pendiente: 2, en_proceso: 1, entregado: 3, rechazado: 1, total: 7 });

    expect(resumen).toEqual({ pendientes: 2, enProceso: 1, completadas: 3, canceladas: 1 });
  });

  it('obtiene el detalle de una solicitud', () => {
    let detalle: unknown;
    service.obtener(10).subscribe((d) => (detalle = d));

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10`);
    expect(req.request.method).toBe('GET');
    req.flush(makeSolicitudDto());

    expect(detalle).toMatchObject({ codigo: 'FR-SPR-090-260912' });
  });

  it('cambiarEstado hace PATCH .../estado con el estado pedido', () => {
    let completado = false;
    service.cambiarEstado(10, 'en_proceso').subscribe(() => (completado = true));

    const req = httpMock.expectOne(`${SOLICITUDES_BASE}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'en_proceso' });
    req.flush({});

    expect(completado).toBe(true);
  });
});
