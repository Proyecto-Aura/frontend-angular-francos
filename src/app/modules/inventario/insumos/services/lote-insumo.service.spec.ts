import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { LoteInsumoDto } from '../interfaces/lote-insumo-dto.interface';
import { LoteInsumoForm } from '../interfaces/lote-insumo.interface';
import { LoteInsumoService } from './lote-insumo.service';

const LOTES_BASE = `${environment.apiUrl}/lotes-insumo`;

function makeLoteDto(overrides: Partial<LoteInsumoDto> = {}): LoteInsumoDto {
  return {
    id: 1,
    insumo_id: 9,
    codigo_lote: 'FR-LT-006-261017-INS9',
    fecha_ingreso: '2026-10-17',
    fecha_vencimiento: '2026-12-01',
    cantidad_inicial: 250,
    cantidad_actual: 250,
    estado: 'activo',
    activo: true,
    created_at: '2026-10-17T00:00:00.000Z',
    updated_at: '2026-10-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('LoteInsumoService', () => {
  let service: LoteInsumoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoteInsumoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response', () => {
    let result: ReturnType<LoteInsumoService['listar']> extends import('rxjs').Observable<infer T>
      ? T
      : never;
    service
      .listar(2, 10, { search: 'FR-LT', insumoId: 9, estado: 'activo', activo: true })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('search') === 'FR-LT' &&
        request.params.get('insumo_id') === '9' &&
        request.params.get('estado') === 'activo' &&
        request.params.get('activo') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeLoteDto()],
      meta: { total: 6, page: 2, limit: 10, total_pages: 1 },
    });

    expect(result!).toMatchObject({ total: 6, pagina: 2, totalPaginas: 1 });
    expect(result!.lotes[0]).toMatchObject({ codigoLote: 'FR-LT-006-261017-INS9' });
  });

  it('omits empty filters from the query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        !request.params.has('search') &&
        !request.params.has('insumo_id') &&
        !request.params.has('estado') &&
        !request.params.has('activo'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('computes the next codigo_lote sequence from the highest existing codigo_lote, not a row count', () => {
    let siguiente: number | undefined;
    service.siguienteSecuencial(9).subscribe((value) => (siguiente = value));

    const req = httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        request.params.get('insumo_id') === '9' &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
    // Caso real que causaba el bug: una sola fila restante (el 001 se borro
    // fuera de la app), pero con codigo_lote "002" — el proximo tiene que
    // ser 3, no "1 fila + 1 = 2" (que chocaria con el codigo existente).
    req.flush({
      data: [makeLoteDto({ codigo_lote: 'FR-LT-002-261017-INS9' })],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    expect(siguiente).toBe(3);
  });

  it('registers a lote with the mapped create request', () => {
    const form: LoteInsumoForm = {
      insumoId: '9',
      codigoLote: 'FR-LT-006-261017-INS9',
      fechaIngreso: '2026-10-17',
      fechaVencimiento: '2026-12-01',
      cantidadInicial: '250',
    };

    service.registrar(form).subscribe();

    const req = httpMock.expectOne(LOTES_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      insumo_id: 9,
      codigo_lote: 'FR-LT-006-261017-INS9',
      fecha_ingreso: '2026-10-17',
      fecha_vencimiento: '2026-12-01',
      cantidad_inicial: 250,
    });
    req.flush(makeLoteDto());
  });

  it('deactivates a lote', () => {
    service.desactivar(5).subscribe();

    const req = httpMock.expectOne(`${LOTES_BASE}/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('activates a lote', () => {
    service.activar(5).subscribe();

    const req = httpMock.expectOne(`${LOTES_BASE}/5/activate`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush(makeLoteDto({ id: 5 }));
  });
});
