import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { MovimientoProductoTerminadoDto } from '../interfaces/movimiento-producto-terminado-dto.interface';
import { MovimientoProductoTerminadoService } from './movimiento-producto-terminado.service';

const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-producto-terminado`;

function makeMovimientoDto(
  overrides: Partial<MovimientoProductoTerminadoDto> = {},
): MovimientoProductoTerminadoDto {
  return {
    id: 1,
    codigo: 'FR-MVP-001-261022-PT256',
    lote_producto_terminado_id: 9,
    codigo_lote: 'FR-LTP-001-261017-PT256',
    producto_terminado_id: 256,
    sku: 'DEMO-MOV-PT-001',
    producto_id: 3,
    producto_nombre: 'Pan de molde',
    categoria_id: 2,
    categoria_nombre: 'Panadería',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    tipo: 'entrada',
    cantidad: 100,
    stock_anterior: 60,
    stock_resultante: 160,
    razon: 'Produccion del dia',
    fecha: '2026-10-22T16:40:00.000Z',
    created_at: '2026-10-22T16:40:00.000Z',
    ...overrides,
  };
}

describe('MovimientoProductoTerminadoService', () => {
  let service: MovimientoProductoTerminadoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MovimientoProductoTerminadoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response, sin unidad_medida suelta (presentacion_cantidad/unidad en su lugar)', () => {
    let result: ReturnType<
      MovimientoProductoTerminadoService['listar']
    > extends import('rxjs').Observable<infer T>
      ? T
      : never;
    service
      .listar(2, 10, { productoTerminadoId: 256, loteProductoTerminadoId: 9, tipo: 'entrada' })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === MOVIMIENTOS_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('producto_terminado_id') === '256' &&
        request.params.get('lote_producto_terminado_id') === '9' &&
        request.params.get('tipo') === 'entrada',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeMovimientoDto()],
      meta: { total: 2, page: 2, limit: 10, total_pages: 1 },
    });

    expect(result!).toMatchObject({ total: 2, pagina: 2, totalPaginas: 1 });
    expect(result!.movimientos[0]).toEqual({
      id: 1,
      codigo: 'FR-MVP-001-261022-PT256',
      loteProductoTerminadoId: 9,
      codigoLote: 'FR-LTP-001-261017-PT256',
      productoTerminadoId: 256,
      sku: 'DEMO-MOV-PT-001',
      productoNombre: 'Pan de molde',
      categoriaNombre: 'Panadería',
      presentacionCantidad: 500,
      presentacionUnidadMedida: 'gr',
      tipo: 'entrada',
      cantidad: 100,
      stockAnterior: 60,
      stockResultante: 160,
      razon: 'Produccion del dia',
      fecha: '2026-10-22T16:40:00.000Z',
    });
  });

  it('omits empty filters from the query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === MOVIMIENTOS_BASE &&
        !request.params.has('search') &&
        !request.params.has('producto_terminado_id') &&
        !request.params.has('lote_producto_terminado_id') &&
        !request.params.has('tipo') &&
        !request.params.has('fecha_desde') &&
        !request.params.has('fecha_hasta'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('sends search as a free-text query param against producto nombre/sku', () => {
    service.listar(1, 10, { search: 'pan' }).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === MOVIMIENTOS_BASE && request.params.get('search') === 'pan',
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('registra una entrada mandando siempre un array, aunque sea de una sola fila', () => {
    let result: ReturnType<
      MovimientoProductoTerminadoService['registrarEntrada']
    > extends import('rxjs').Observable<infer T>
      ? T
      : never;
    service
      .registrarEntrada([
        { lote_producto_terminado_id: 9, cantidad: 50, razon: 'Produccion del dia' },
      ])
      .subscribe((movimientos) => (result = movimientos));

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/entrada`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { lote_producto_terminado_id: 9, cantidad: 50, razon: 'Produccion del dia' },
    ]);
    req.flush([makeMovimientoDto()]);

    expect(result!).toHaveLength(1);
    expect(result![0]).toMatchObject({ id: 1, codigoLote: 'FR-LTP-001-261017-PT256' });
  });

  it('registra una salida con producto_terminado_id (el backend reparte FEFO, no se elige lote)', () => {
    service
      .registrarSalida([{ producto_terminado_id: 256, cantidad: 30, razon: 'Despacho a cliente' }])
      .subscribe();

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/salida`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { producto_terminado_id: 256, cantidad: 30, razon: 'Despacho a cliente' },
    ]);
    req.flush([
      makeMovimientoDto({ tipo: 'salida', id: 1 }),
      makeMovimientoDto({ tipo: 'salida', id: 2 }),
    ]);
  });

  it('registra un ajuste con lote_producto_terminado_id y cantidad firmada (delta, no la cantidad real)', () => {
    service
      .registrarAjuste([{ lote_producto_terminado_id: 9, cantidad: -15, razon: 'Conteo físico' }])
      .subscribe();

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/ajuste`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { lote_producto_terminado_id: 9, cantidad: -15, razon: 'Conteo físico' },
    ]);
    req.flush([makeMovimientoDto({ tipo: 'ajuste', cantidad: -15 })]);
  });
});
