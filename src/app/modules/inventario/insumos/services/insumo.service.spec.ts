import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { InsumoDto } from '../interfaces/insumo-dto.interface';
import { InsumoForm } from '../interfaces/insumo.interface';
import { InsumoService } from './insumo.service';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;

function makeInsumoDto(overrides: Partial<InsumoDto> = {}): InsumoDto {
  return {
    id: 1,
    sku: 'FR-INS-1',
    nombre: 'Harina de trigo',
    descripcion: null,
    unidad_medida: 'kg',
    stock_actual: 250,
    stock_minimo: 50,
    stock_maximo: 400,
    tipo: 'materia_prima',
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('InsumoService', () => {
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

  it('lists a requested page and maps the response', () => {
    let result: ReturnType<InsumoService['listar']> extends import('rxjs').Observable<infer T>
      ? T
      : never;
    service
      .listar(2, 10, { search: 'harina', estado: true, tipo: 'materia_prima' })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === INSUMOS_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('search') === 'harina' &&
        request.params.get('estado') === 'true' &&
        request.params.get('tipo') === 'materia_prima',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeInsumoDto()],
      meta: { total: 11, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result!).toMatchObject({ total: 11, pagina: 2, totalPaginas: 2 });
    expect(result!.insumos[0]).toMatchObject({ sku: 'FR-INS-1', stockActual: 250 });
  });

  it('sends estado=false as the literal boolean, not an omitted/falsy value', () => {
    service.listar(1, 10, { estado: false }).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === INSUMOS_BASE && request.params.get('estado') === 'false',
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('omits empty filters from the query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === INSUMOS_BASE &&
        !request.params.has('search') &&
        !request.params.has('estado') &&
        !request.params.has('tipo') &&
        !request.params.has('nivel'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('sends nivel as a query param (calculado por el backend, no por el front)', () => {
    service.listar(1, 10, { nivel: 'bajo' }).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === INSUMOS_BASE && request.params.get('nivel') === 'bajo',
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('fetches the indicadores summary and renames agotado to agotados', () => {
    let result: unknown;
    service.indicadores().subscribe((resumen) => (result = resumen));

    const req = httpMock.expectOne(`${INSUMOS_BASE}/indicadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ total: 8, normal: 3, alto: 1, bajo: 2, agotado: 2 });

    expect(result).toEqual({ total: 8, normal: 3, alto: 1, bajo: 2, agotados: 2 });
  });

  it('registers an insumo with the mapped create request (no stock_actual — el backend lo rechaza)', () => {
    const form: InsumoForm = {
      nombre: '  Harina especial  ',
      descripcion: '  ',
      tipo: 'materia_prima',
      unidadMedida: 'kg',
      stockMinimo: '10',
      stockMaximo: '100',
    };

    service.registrar(form).subscribe();

    const req = httpMock.expectOne(INSUMOS_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Harina especial',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 10,
      stock_maximo: 100,
    });
    req.flush(makeInsumoDto({ id: 9, sku: 'FR-INS-9', nombre: 'Harina especial' }));
  });

  it('updates an insumo with the mapped update request (no stock_actual)', () => {
    const form: InsumoForm = {
      nombre: 'Harina de trigo 000',
      descripcion: '',
      tipo: 'materia_prima',
      unidadMedida: 'kg',
      stockMinimo: '50',
      stockMaximo: '500',
    };

    service.actualizar(1, form).subscribe();

    const req = httpMock.expectOne(`${INSUMOS_BASE}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      nombre: 'Harina de trigo 000',
      tipo: 'materia_prima',
      unidad_medida: 'kg',
      stock_minimo: 50,
      stock_maximo: 500,
    });
    req.flush(makeInsumoDto({ id: 1, nombre: 'Harina de trigo 000' }));
  });

  it('deactivates an insumo', () => {
    service.desactivar(5).subscribe();

    const req = httpMock.expectOne(`${INSUMOS_BASE}/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('activates an insumo', () => {
    service.activar(5).subscribe();

    const req = httpMock.expectOne(`${INSUMOS_BASE}/5/activate`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush(makeInsumoDto({ id: 5, estado: true }));
  });
});
