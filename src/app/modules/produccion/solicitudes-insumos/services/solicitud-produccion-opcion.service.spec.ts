import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { SolicitudProduccionOpcionService } from './solicitud-produccion-opcion.service';

const SOLICITUDES_PRODUCCION_BASE = `${environment.apiUrl}/produccion/solicitudes`;

describe('SolicitudProduccionOpcionService (Produccion)', () => {
  let service: SolicitudProduccionOpcionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SolicitudProduccionOpcionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists solicitudes de produccion mapeando solo id/codigo/estado', () => {
    let resultado: unknown;
    service.listar(1, 100, { estado: 'en_proceso' }).subscribe((r) => (resultado = r));

    const req = httpMock.expectOne(
      (r) =>
        r.url === SOLICITUDES_PRODUCCION_BASE &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '100' &&
        r.params.get('estado') === 'en_proceso',
    );
    req.flush({
      data: [{ id: 6, codigo: 'FR-SPR-001-261104', estado: 'en_proceso' }],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    expect(resultado).toEqual([{ id: 6, codigo: 'FR-SPR-001-261104', estado: 'en_proceso' }]);
  });

  it('omits estado from the query params cuando no se pasa', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === SOLICITUDES_PRODUCCION_BASE &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '100',
    );
    expect(req.request.params.has('estado')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
  });
});
