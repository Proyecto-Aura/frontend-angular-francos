import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { InsumoService } from './insumo.service';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;

describe('InsumoService (Produccion)', () => {
  let service: InsumoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InsumoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists insumos mapping snake_case a camelCase', () => {
    let resultado: unknown;
    service.listar(1, 100, { estado: true }).subscribe((r) => (resultado = r));

    const req = httpMock.expectOne(
      (r) =>
        r.url === INSUMOS_BASE &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '100' &&
        r.params.get('estado') === 'true',
    );
    req.flush({
      data: [
        {
          id: 12,
          sku: 'FR-INS-012',
          nombre: 'Harina de trigo',
          unidad_medida: 'kg',
          stock_actual: 45,
          stock_minimo: 10,
        },
      ],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    expect(resultado).toEqual({
      insumos: [
        {
          id: 12,
          sku: 'FR-INS-012',
          nombre: 'Harina de trigo',
          unidadMedida: 'kg',
          stockActual: 45,
          stockMinimo: 10,
        },
      ],
      total: 1,
      pagina: 1,
      totalPaginas: 1,
    });
  });

  it('omits search/estado query params cuando no se pasan', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === INSUMOS_BASE && r.params.get('page') === '1' && r.params.get('limit') === '10',
    );
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('estado')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });
});
