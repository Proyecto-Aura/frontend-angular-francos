import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import {
  PedidoPrepararDetalleDto,
  PedidoPrepararResumenDto,
} from '../interfaces/pedido-preparar-dto.interface';
import { PedidoPrepararService } from './pedido-preparar.service';

const PEDIDOS_PREPARAR_BASE = `${environment.apiUrl}/inventario/pedidos`;

function makeResumenDto(
  overrides: Partial<PedidoPrepararResumenDto> = {},
): PedidoPrepararResumenDto {
  return {
    id: 1042,
    codigo: 'PED-001042',
    cliente: { id: 'uuid-1', nombre: 'Supermercados Andina' },
    metodo_pago: 'efectivo',
    total: '1250.50',
    tipo_entrega: 'delivery',
    estado: 'en_espera_inventario',
    origen: 'portal',
    productos: 3,
    unidades: 210,
    fecha_entrega: null,
    created_at: '2026-09-12T09:05:00.000Z',
    disponibilidad: 'completo',
    ...overrides,
  };
}

function makeDetalleDto(
  overrides: Partial<PedidoPrepararDetalleDto> = {},
): PedidoPrepararDetalleDto {
  return {
    id: 1042,
    codigo: 'PED-001042',
    cliente: { id: 'uuid-1', nombre: 'Supermercados Andina' },
    origen: 'portal',
    estado: 'en_espera_inventario',
    tipo_entrega: 'delivery',
    direccion_entrega: 'Av. Siempre Viva 123',
    total: '1250.50',
    fecha_entrega: null,
    created_at: '2026-09-12T09:05:00.000Z',
    updated_at: '2026-09-12T09:05:00.000Z',
    items: [
      {
        id: 1,
        producto_presentacion_id: 10,
        sku: 'SKU-1',
        producto: 'Queso fresco',
        presentacion: '1 kg',
        cantidad: 10,
        precio_unitario: '12.50',
        precio_aplicado: '11.00',
        subtotal: '110.00',
        stock_disponible: 15,
      },
    ],
    disponibilidad: 'completo',
    pago: {
      metodo_pago: 'efectivo',
      monto: '120.50',
      numero_operacion: null,
      fecha_pago: '2026-09-12T09:06:00.000Z',
      comprobante: null,
    },
    ...overrides,
  };
}

describe('PedidoPrepararService', () => {
  let service: PedidoPrepararService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PedidoPrepararService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista una pagina y mapea cliente.nombre + productos/unidades', () => {
    let result: ReturnType<PedidoPrepararService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service
      .listar(2, 10, { search: 'PED', estado: 'en_preparacion', fecha: '2026-09-12' })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === PEDIDOS_PREPARAR_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('search') === 'PED' &&
        request.params.get('estado') === 'en_preparacion' &&
        request.params.get('fecha') === '2026-09-12',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [makeResumenDto()], meta: { total: 1, page: 2, limit: 10, total_pages: 1 } });

    expect(result!).toMatchObject({ total: 1, pagina: 2, totalPaginas: 1 });
    expect(result!.pedidos[0]).toEqual({
      id: 1042,
      codigo: 'PED-001042',
      estado: 'en_espera_inventario',
      fechaCreacion: '2026-09-12T09:05:00.000Z',
      clienteNombre: 'Supermercados Andina',
      cantidadProductos: 3,
      cantidadUnidades: 210,
      disponibilidad: 'completo',
    });
  });

  it('sends independent date range parameters without the legacy date', () => {
    service.listar(1, 10, { fechaDesde: '2026-09-12', fechaHasta: '2026-09-15' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === PEDIDOS_PREPARAR_BASE);
    expect(req.request.params.get('fecha_desde')).toBe('2026-09-12');
    expect(req.request.params.get('fecha_hasta')).toBe('2026-09-15');
    expect(req.request.params.has('fecha')).toBe(false);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('omite los filtros vacios de los query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === PEDIDOS_PREPARAR_BASE &&
        !request.params.has('search') &&
        !request.params.has('estado') &&
        !request.params.has('fecha'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('pide los indicadores de los 3 estados', () => {
    let resumen: unknown;
    service.indicadores().subscribe((r) => (resumen = r));

    const req = httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/indicadores`);
    expect(req.request.method).toBe('GET');
    req.flush({ en_espera_inventario: 2, en_preparacion: 1, pendiente_entrega: 1 });

    expect(resumen).toEqual({ enEsperaInventario: 2, enPreparacion: 1, pendienteEntrega: 1 });
  });

  it('obtiene el detalle de un pedido', () => {
    let detalle: unknown;
    service.obtener(1042).subscribe((d) => (detalle = d));

    const req = httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`);
    expect(req.request.method).toBe('GET');
    req.flush(makeDetalleDto());

    expect(detalle).toMatchObject({ codigo: 'PED-001042', clienteNombre: 'Supermercados Andina' });
  });

  it('marcarEnPreparacion hace PATCH sin body y mapea el pedido devuelto', () => {
    let resultado: unknown;
    service.marcarEnPreparacion(1042).subscribe((d) => (resultado = d));

    const req = httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/en-preparacion`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush(makeDetalleDto({ estado: 'en_preparacion' }));

    expect(resultado).toMatchObject({ estado: 'en_preparacion' });
  });

  it('marcarPendienteEntrega manda las cantidades preparadas en snake_case y mapea el pedido devuelto', () => {
    let resultado: unknown;
    service
      .marcarPendienteEntrega(1042, [{ productoPresentacionId: 10, cantidadPreparada: 8 }])
      .subscribe((d) => (resultado = d));

    const req = httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/pendiente-entrega`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      items: [{ producto_presentacion_id: 10, cantidad_preparada: 8 }],
    });
    req.flush(makeDetalleDto({ estado: 'pendiente_entrega' }));

    expect(resultado).toMatchObject({ estado: 'pendiente_entrega' });
  });
});
