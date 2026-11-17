import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import {
  CategoriaDto,
  PresentacionDto,
  ProductoPresentacionDto,
} from '../interfaces/producto-presentacion-dto.interface';
import { ProductoPresentacionService } from './producto-presentacion.service';

const PRODUCTO_PRESENTACIONES_BASE = `${environment.apiUrl}/producto-presentaciones`;
const PRODUCTOS_TERMINADOS_BASE = `${environment.apiUrl}/productos-terminados`;
const CATEGORIAS_BASE = `${environment.apiUrl}/categorias`;
const PRESENTACIONES_BASE = `${environment.apiUrl}/presentaciones`;

function makeProductoPresentacionDto(
  overrides: Partial<ProductoPresentacionDto> = {},
): ProductoPresentacionDto {
  return {
    id: 7,
    sku: 'FR-P3-PR2',
    estado: true,
    producto_id: 3,
    presentacion_id: 2,
    producto: {
      id: 3,
      nombre: 'Pan de molde',
      descripcion: 'Pan de molde integral, bolsa sellada.',
      categoria: { id: 2, nombre: 'Panadería' },
    },
    presentacion: { id: 2, cantidad: 500, unidad_medida: 'gr' },
    producto_terminado: { id: 25, stock_actual: 45, stock_minimo: 10, stock_maximo: 300 },
    ...overrides,
  };
}

describe('ProductoPresentacionService', () => {
  let service: ProductoPresentacionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductoPresentacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response, uniendo sku/producto/categoria/presentacion/stock', () => {
    let result: ReturnType<ProductoPresentacionService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service
      .listar(2, 10, {
        search: 'pan',
        estado: true,
        categoriaId: 2,
        presentacionId: 2,
        conStock: true,
      })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === PRODUCTO_PRESENTACIONES_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('search') === 'pan' &&
        request.params.get('estado') === 'true' &&
        request.params.get('categoria_id') === '2' &&
        request.params.get('presentacion_id') === '2' &&
        request.params.get('con_stock') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeProductoPresentacionDto()],
      meta: { total: 16, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result!).toMatchObject({ total: 16, pagina: 2, totalPaginas: 2 });
    expect(result!.productos[0]).toEqual({
      id: 7,
      productoTerminadoId: 25,
      sku: 'FR-P3-PR2',
      productoNombre: 'Pan de molde',
      productoDescripcion: 'Pan de molde integral, bolsa sellada.',
      categoriaId: 2,
      categoriaNombre: 'Panadería',
      presentacionId: 2,
      presentacionCantidad: 500,
      presentacionUnidadMedida: 'gr',
      estado: true,
      stockActual: 45,
      stockMinimo: 10,
      stockMaximo: 300,
    });
  });

  it('omits empty filters from the query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === PRODUCTO_PRESENTACIONES_BASE &&
        !request.params.has('search') &&
        !request.params.has('estado') &&
        !request.params.has('categoria_id') &&
        !request.params.has('presentacion_id') &&
        !request.params.has('con_stock') &&
        !request.params.has('nivel'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('sends nivel as a query param (calculado por el backend, no por el front)', () => {
    service.listar(1, 10, { nivel: 'bajo' }).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === PRODUCTO_PRESENTACIONES_BASE && request.params.get('nivel') === 'bajo',
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('defaults a null producto_terminado to stock 0 / sin tope (caso raro, confirmado por el backend)', () => {
    let result: ReturnType<ProductoPresentacionService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service.listar().subscribe((pagina) => (result = pagina));

    httpMock
      .expectOne(
        (request) =>
          request.url === PRODUCTO_PRESENTACIONES_BASE &&
          request.params.get('page') === '1' &&
          request.params.get('limit') === '10',
      )
      .flush({
        data: [makeProductoPresentacionDto({ producto_terminado: null })],
        meta: { total: 1, page: 1, limit: 10, total_pages: 1 },
      });

    expect(result!.productos[0]).toMatchObject({
      stockActual: 0,
      stockMinimo: 0,
      stockMaximo: null,
    });
  });

  it('fetches the indicadores summary and renames agotado to agotados', () => {
    let result: unknown;
    service.indicadores().subscribe((resumen) => (result = resumen));

    const req = httpMock.expectOne(`${PRODUCTOS_TERMINADOS_BASE}/indicadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ total: 16, normal: 10, alto: 1, bajo: 3, agotado: 2 });

    expect(result).toEqual({ total: 16, normal: 10, alto: 1, bajo: 3, agotados: 2 });
  });

  it('updates stock_minimo y stock_maximo juntos (ambos son requeridos en esta UI), ignorando el shape plano de la respuesta', () => {
    let completo = false;
    service.actualizarStock(7, { stockMinimo: '15', stockMaximo: '300' }).subscribe({
      complete: () => (completo = true),
    });

    const req = httpMock.expectOne(`${PRODUCTOS_TERMINADOS_BASE}/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ stock_minimo: 15, stock_maximo: 300 });
    // El PATCH responde con un shape plano distinto al de GET /producto-presentaciones
    // (sin producto/presentacion anidados, "id" distinto al producto_presentacion_id) —
    // confirmado por el backend. El servicio ignora este body (el caller refresca via GET).
    req.flush({
      id: 25,
      producto_presentacion_id: 7,
      sku: 'FR-P3-PR2',
      producto_id: 3,
      producto_nombre: 'Pan de molde',
      categoria_id: 2,
      categoria_nombre: 'Panadería',
      presentacion_id: 2,
      presentacion_cantidad: 500,
      presentacion_unidad_medida: 'gr',
      stock_actual: 45,
      stock_minimo: 15,
      stock_maximo: 300,
      created_at: '2026-10-25T19:33:31.240Z',
      updated_at: '2026-10-25T21:40:55.011Z',
    });

    expect(completo).toBe(true);
  });

  it('lists categorias as select options', () => {
    let result: ReturnType<
      ProductoPresentacionService['listarCategorias']
    > extends import('rxjs').Observable<infer T>
      ? T
      : never;
    service.listarCategorias().subscribe((opciones) => (result = opciones));

    const req = httpMock.expectOne(
      (request) =>
        request.url === CATEGORIAS_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
    const dto: CategoriaDto = { id: 2, nombre: 'Panadería', descripcion: null, estado: true };
    req.flush({ data: [dto], meta: { total: 1, page: 1, limit: 100, total_pages: 1 } });

    expect(result!).toEqual([{ id: 2, nombre: 'Panadería' }]);
  });

  it('lists presentaciones as select options', () => {
    let result: ReturnType<
      ProductoPresentacionService['listarPresentaciones']
    > extends import('rxjs').Observable<infer T>
      ? T
      : never;
    service.listarPresentaciones().subscribe((opciones) => (result = opciones));

    const req = httpMock.expectOne(
      (request) =>
        request.url === PRESENTACIONES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
    const dto: PresentacionDto = {
      id: 2,
      cantidad: 500,
      unidad_medida: 'gr',
      descripcion: null,
      estado: true,
    };
    req.flush({ data: [dto], meta: { total: 1, page: 1, limit: 100, total_pages: 1 } });

    expect(result!).toEqual([{ id: 2, cantidad: 500, unidadMedida: 'gr' }]);
  });

  it('deactivates a producto_presentacion', () => {
    service.desactivar(7).subscribe();

    const req = httpMock.expectOne(`${PRODUCTO_PRESENTACIONES_BASE}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('activates a producto_presentacion, ignorando el shape plano de la respuesta', () => {
    let completo = false;
    service.activar(7).subscribe({ complete: () => (completo = true) });

    const req = httpMock.expectOne(`${PRODUCTO_PRESENTACIONES_BASE}/7/activate`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    // El activate responde con el shape plano normal de producto_presentacion
    // (confirmado por el backend), no el embebido de GET /producto-presentaciones.
    req.flush({ id: 7, sku: 'FR-P3-PR2', estado: true, producto_id: 3, presentacion_id: 2 });

    expect(completo).toBe(true);
  });
});
