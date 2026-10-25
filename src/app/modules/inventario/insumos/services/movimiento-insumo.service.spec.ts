import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { MovimientoInsumoDto } from '../interfaces/movimiento-insumo-dto.interface';
import { MovimientoInsumoService } from './movimiento-insumo.service';

const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-insumo`;

function makeMovimientoDto(overrides: Partial<MovimientoInsumoDto> = {}): MovimientoInsumoDto {
  return {
    id: 1,
    codigo: 'FR-MV-001-261022-INS5',
    lote_insumo_id: 9,
    codigo_lote: 'FR-LT-006-261017-INS9',
    insumo_id: 5,
    insumo_nombre: 'Harina de trigo',
    insumo_sku: 'FR-INS-5',
    insumo_unidad_medida: 'kg',
    tipo: 'entrada',
    cantidad: 100,
    stock_anterior: 170,
    stock_resultante: 270,
    razon: 'Ingreso de lote',
    fecha: '2026-10-22T16:40:00.000Z',
    created_at: '2026-10-22T16:40:00.000Z',
    ...overrides,
  };
}

describe('MovimientoInsumoService', () => {
  let service: MovimientoInsumoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MovimientoInsumoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response, including razon y lote_insumo_id', () => {
    let result: ReturnType<MovimientoInsumoService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service
      .listar(2, 10, { insumoId: 5, loteInsumoId: 9, tipo: 'entrada' })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === MOVIMIENTOS_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('insumo_id') === '5' &&
        request.params.get('lote_insumo_id') === '9' &&
        request.params.get('tipo') === 'entrada',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeMovimientoDto()],
      meta: { total: 4, page: 2, limit: 10, total_pages: 1 },
    });

    expect(result!).toMatchObject({ total: 4, pagina: 2, totalPaginas: 1 });
    expect(result!.movimientos[0]).toEqual({
      id: 1,
      codigo: 'FR-MV-001-261022-INS5',
      loteInsumoId: 9,
      codigoLote: 'FR-LT-006-261017-INS9',
      insumoId: 5,
      insumoNombre: 'Harina de trigo',
      insumoSku: 'FR-INS-5',
      insumoUnidadMedida: 'kg',
      tipo: 'entrada',
      cantidad: 100,
      stockAnterior: 170,
      stockResultante: 270,
      razon: 'Ingreso de lote',
      fecha: '2026-10-22T16:40:00.000Z',
    });
  });

  it('omits empty filters from the query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === MOVIMIENTOS_BASE &&
        !request.params.has('search') &&
        !request.params.has('insumo_id') &&
        !request.params.has('lote_insumo_id') &&
        !request.params.has('tipo') &&
        !request.params.has('fecha_desde') &&
        !request.params.has('fecha_hasta'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('sends search as a free-text query param against insumo nombre/sku', () => {
    service.listar(1, 10, { search: 'harina' }).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === MOVIMIENTOS_BASE && request.params.get('search') === 'harina',
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('passes a signed cantidad through untouched for tipo ajuste', () => {
    let result: ReturnType<MovimientoInsumoService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service.listar(1, 10, { insumoId: 5 }).subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) => request.url === MOVIMIENTOS_BASE && request.params.get('insumo_id') === '5',
    );
    req.flush({
      data: [makeMovimientoDto({ tipo: 'ajuste', cantidad: -15 })],
      meta: { total: 1, page: 1, limit: 10, total_pages: 1 },
    });

    expect(result!.movimientos[0]).toMatchObject({ tipo: 'ajuste', cantidad: -15 });
  });

  it('registra una entrada mandando siempre un array, aunque sea de una sola fila', () => {
    let result: ReturnType<MovimientoInsumoService['registrarEntrada']> extends import(
      'rxjs'
    ).Observable<infer T>
      ? T
      : never;
    service
      .registrarEntrada([{ lote_insumo_id: 9, cantidad: 50, razon: 'Compra a proveedor' }])
      .subscribe((movimientos) => (result = movimientos));

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/entrada`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { lote_insumo_id: 9, cantidad: 50, razon: 'Compra a proveedor' },
    ]);
    req.flush([makeMovimientoDto()]);

    expect(result!).toHaveLength(1);
    expect(result![0]).toMatchObject({ id: 1, codigoLote: 'FR-LT-006-261017-INS9' });
  });

  it('registra una salida con insumo_id (el backend reparte FEFO)', () => {
    service
      .registrarSalida([{ insumo_id: 5, cantidad: 30, razon: 'Entrega a producción' }])
      .subscribe();

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/salida`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([{ insumo_id: 5, cantidad: 30, razon: 'Entrega a producción' }]);
    req.flush([
      makeMovimientoDto({ tipo: 'salida', id: 1 }),
      makeMovimientoDto({ tipo: 'salida', id: 2 }),
    ]);
  });

  it('registra un ajuste con lote_insumo_id y cantidad firmada (delta, no la cantidad real)', () => {
    service
      .registrarAjuste([{ lote_insumo_id: 1, cantidad: -15, razon: 'Conteo físico' }])
      .subscribe();

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/ajuste`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { lote_insumo_id: 1, cantidad: -15, razon: 'Conteo físico' },
    ]);
    req.flush([makeMovimientoDto({ tipo: 'ajuste', cantidad: -15 })]);
  });
});
