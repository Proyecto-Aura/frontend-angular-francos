import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { LoteProductoTerminadoDto } from '../../interfaces/lote-producto-terminado-dto.interface';
import {
  PedidoPrepararDetalleDto,
  PedidoPrepararResumenDto,
} from '../../interfaces/pedido-preparar-dto.interface';
import { ProductoPresentacionDto } from '../../interfaces/producto-presentacion-dto.interface';
import { MovimientoProductoTerminadoFormModal } from './movimiento-producto-terminado-form-modal';

const PRODUCTO_PRESENTACIONES_BASE = `${environment.apiUrl}/producto-presentaciones`;
const LOTES_BASE = `${environment.apiUrl}/lotes-producto-terminado`;
const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-producto-terminado`;
const PEDIDOS_PREPARAR_BASE = `${environment.apiUrl}/inventario/pedidos`;

function makeProductoDto(
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
    producto_terminado: { id: 256, stock_actual: 250, stock_minimo: 50, stock_maximo: 400 },
    ...overrides,
  };
}

function makeLoteDto(overrides: Partial<LoteProductoTerminadoDto> = {}): LoteProductoTerminadoDto {
  return {
    id: 1,
    producto_terminado_id: 256,
    sku: 'FR-P3-PR2',
    producto_id: 3,
    producto_nombre: 'Pan de molde',
    categoria_id: 2,
    categoria_nombre: 'Panadería',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    codigo_lote: 'FR-LTP-001-261001-PT256',
    fecha_produccion: '2026-10-01',
    fecha_vencimiento: '2026-11-01',
    cantidad_inicial: 50,
    cantidad_actual: 50,
    estado: 'activo',
    activo: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePedidoResumenDto(
  overrides: Partial<PedidoPrepararResumenDto> = {},
): PedidoPrepararResumenDto {
  return {
    id: 50,
    codigo: 'PED-000050',
    cliente: { id: 'uuid-1', nombre: 'Supermercados Andina' },
    metodo_pago: 'efectivo',
    total: '100.00',
    tipo_entrega: 'delivery',
    estado: 'en_preparacion',
    origen: 'portal',
    productos: 1,
    unidades: 10,
    fecha_entrega: null,
    created_at: '2026-09-12T09:05:00.000Z',
    disponibilidad: 'completo',
    ...overrides,
  };
}

function makePedidoDetalleDto(
  overrides: Partial<PedidoPrepararDetalleDto> = {},
): PedidoPrepararDetalleDto {
  return {
    id: 50,
    codigo: 'PED-000050',
    cliente: { id: 'uuid-1', nombre: 'Supermercados Andina' },
    origen: 'portal',
    estado: 'en_preparacion',
    tipo_entrega: 'delivery',
    direccion_entrega: 'Av. Siempre Viva 123',
    total: '100.00',
    fecha_entrega: null,
    created_at: '2026-09-12T09:05:00.000Z',
    updated_at: '2026-09-12T09:05:00.000Z',
    items: [
      {
        id: 1,
        producto_presentacion_id: 10,
        sku: 'FR-P3-PR2',
        producto: 'Pan de molde',
        presentacion: '500 gr',
        cantidad: 10,
        precio_unitario: '12.50',
        precio_aplicado: '11.00',
        subtotal: '110.00',
        stock_disponible: 15,
      },
    ],
    disponibilidad: 'completo',
    pago: null,
    ...overrides,
  };
}

function makeMovimientoRespuestaDto(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 1,
    codigo: 'FR-MVP-001-261022-PT256',
    lote_producto_terminado_id: 1,
    codigo_lote: 'FR-LTP-001',
    producto_terminado_id: 256,
    sku: 'FR-P3-PR2',
    producto_id: 3,
    producto_nombre: 'Pan de molde',
    categoria_id: 2,
    categoria_nombre: 'Panadería',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    tipo: 'entrada',
    cantidad: 30,
    stock_anterior: 250,
    stock_resultante: 280,
    razon: 'Producción del día',
    fecha: '2026-10-22T16:40:00.000Z',
    created_at: '2026-10-22T16:40:00.000Z',
    ...overrides,
  };
}

describe('MovimientoProductoTerminadoFormModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function openModal(
    productos: ProductoPresentacionDto[] = [makeProductoDto()],
    pedidos: PedidoPrepararResumenDto[] = [],
  ): ComponentFixture<MovimientoProductoTerminadoFormModal> {
    const fixture = TestBed.createComponent(MovimientoProductoTerminadoFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    httpMock
      .expectOne((request) => request.url === PRODUCTO_PRESENTACIONES_BASE)
      .flush({
        data: productos,
        meta: { total: productos.length, page: 1, limit: 100, total_pages: 1 },
      });
    httpMock
      .expectOne(
        (request) =>
          request.url === PEDIDOS_PREPARAR_BASE &&
          request.params.get('estado') === 'en_preparacion',
      )
      .flush({
        data: pedidos,
        meta: { total: pedidos.length, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();

    return fixture;
  }

  function seleccionarProductoYResolverLotes(
    fixture: ComponentFixture<MovimientoProductoTerminadoFormModal>,
    filaId: number,
    productoTerminadoId: string,
    lotes: LoteProductoTerminadoDto[],
  ): void {
    fixture.componentInstance.seleccionarProductoDeFila(filaId, productoTerminadoId);
    httpMock
      .expectOne(
        (request) =>
          request.url === LOTES_BASE &&
          request.params.get('producto_terminado_id') === productoTerminadoId,
      )
      .flush({ data: lotes, meta: { total: lotes.length, page: 1, limit: 100, total_pages: 1 } });
    fixture.detectChanges();
  }

  it('loads pedidos en_preparacion into pedidosOptions when opened', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);

    expect(fixture.componentInstance.pedidosOptions()).toEqual([
      { value: '50', label: 'PED-000050', secondary: 'Supermercados Andina' },
    ]);
  });

  function seleccionarPedidoYResolverDetalle(
    fixture: ComponentFixture<MovimientoProductoTerminadoFormModal>,
    overrides: Partial<PedidoPrepararDetalleDto> = {},
  ): void {
    fixture.componentInstance.seleccionarPedido('50');
    httpMock
      .expectOne((request) => request.url === `${PEDIDOS_PREPARAR_BASE}/50`)
      .flush(makePedidoDetalleDto(overrides));
    fixture.detectChanges();

    // seleccionarPedido tambien dispara cargarLotesDeProducto() para cada
    // producto resuelto (para que la columna "Lotes" no quede vacia) —
    // se flushean esas peticiones (vacias por defecto) para no dejar
    // requests abiertas en httpMock.verify().
    httpMock
      .match((request) => request.url === LOTES_BASE)
      .forEach((req) =>
        req.flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } }),
      );
    fixture.detectChanges();
  }

  it('seleccionarPedido carga el detalle y autocompleta producto+cantidad en la MISMA tabla (filas) y motivoGeneral, sin cerrar el form', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);

    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));

    seleccionarPedidoYResolverDetalle(fixture);

    expect(cerrado).toBe(false);
    expect(fixture.componentInstance.motivoGeneral()).toBe('Pedido PED-000050');
    // productoTerminadoId '256' se resuelve por SKU contra el catalogo
    // (makeProductoDto tiene sku 'FR-P3-PR2' -> producto_terminado.id 256,
    // igual que el item del pedido).
    expect(fixture.componentInstance.filas()).toEqual([
      { id: 1, productoTerminadoId: '256', loteId: '', cantidad: '10' },
    ]);
  });

  it('seleccionarPedido con valor vacio limpia pedido() y vuelve la tabla a una fila vacia', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);
    seleccionarPedidoYResolverDetalle(fixture);

    fixture.componentInstance.seleccionarPedido('');

    expect(fixture.componentInstance.pedido()).toBeNull();
    const [fila] = fixture.componentInstance.filas();
    expect(fixture.componentInstance.filas()).toHaveLength(1);
    expect(fila).toMatchObject({ productoTerminadoId: '', loteId: '', cantidad: '' });
    httpMock.expectNone(`${PEDIDOS_PREPARAR_BASE}/50`);
  });

  it('el combobox de producto queda deshabilitado por fila mientras hay un pedido elegido', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);
    seleccionarPedidoYResolverDetalle(fixture);

    const combobox: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '#movimiento-pt-producto-1',
    );
    expect(combobox?.disabled).toBe(true);
  });

  it('seleccionarPedido dispara la carga de lotes para cada producto resuelto (la columna Lotes no queda vacia)', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);

    fixture.componentInstance.seleccionarPedido('50');
    httpMock
      .expectOne((r) => r.url === `${PEDIDOS_PREPARAR_BASE}/50`)
      .flush(makePedidoDetalleDto());

    const loteReq = httpMock.expectOne(
      (r) => r.url === LOTES_BASE && r.params.get('producto_terminado_id') === '256',
    );
    loteReq.flush({
      data: [makeLoteDto()],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });
    fixture.detectChanges();

    const [fila] = fixture.componentInstance.filas();
    expect(fixture.componentInstance.lotesDeFila(fila)).toEqual([
      expect.objectContaining({ id: 1 }),
    ]);
  });

  it('guardar() con pedido elegido bloquea con error si algun producto del pedido no se pudo resolver en el catalogo', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);
    seleccionarPedidoYResolverDetalle(fixture, {
      items: [
        {
          id: 1,
          producto_presentacion_id: 99,
          sku: 'FR-NO-EXISTE',
          producto: 'Producto fantasma',
          presentacion: '1 kg',
          cantidad: 5,
          precio_unitario: '1.00',
          precio_aplicado: '1.00',
          subtotal: '5.00',
          stock_disponible: 0,
        },
      ],
    });

    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errorGeneral()).toContain('No se pudo identificar');
    httpMock.expectNone((r) => r.method === 'PATCH');
  });

  it('actualizarCantidadDeFila sigue funcionando sobre la fila autocompletada por el pedido', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);
    seleccionarPedidoYResolverDetalle(fixture);

    fixture.componentInstance.actualizarCantidadDeFila(1, '7');

    expect(fixture.componentInstance.filas()[0].cantidad).toBe('7');
  });

  it('guardar() con pedido elegido llama a marcarPendienteEntrega (no al endpoint generico) y cierra al confirmar', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);
    seleccionarPedidoYResolverDetalle(fixture);
    fixture.componentInstance.actualizarCantidadDeFila(1, '8');

    let guardadoEmitido: unknown;
    fixture.componentInstance.saved.subscribe((v) => (guardadoEmitido = v));
    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/50/pendiente-entrega`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      items: [{ producto_presentacion_id: 10, cantidad_preparada: 8 }],
    });
    req.flush(makePedidoDetalleDto({ estado: 'pendiente_entrega' }));

    expect(guardadoEmitido).toEqual([]);
    expect(cerrado).toBe(true);
    httpMock.expectNone((r) => r.url === MOVIMIENTOS_BASE);
  });

  it('guardar() con pedido elegido muestra un mensaje de stock insuficiente en 409', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);
    seleccionarPedidoYResolverDetalle(fixture);

    fixture.componentInstance.guardar();

    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/50/pendiente-entrega`)
      .flush('conflict', { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorGeneral()).toContain('No hay stock suficiente');
  });

  it('entregaPedidoBloqueada es true cuando la disponibilidad del pedido no es completo, y guardar() no hace nada', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);
    seleccionarPedidoYResolverDetalle(fixture, { disponibilidad: 'parcial' });

    expect(fixture.componentInstance.entregaPedidoBloqueada()).toBe(true);

    fixture.componentInstance.guardar();
    httpMock.expectNone((r) => r.method === 'PATCH');
  });

  it('seleccionarTipoMovimiento limpia el pedido elegido al salir de "salida" (no queda un pedido fantasma)', () => {
    const fixture = openModal([makeProductoDto()], [makePedidoResumenDto()]);
    fixture.componentInstance.seleccionarTipoMovimiento('salida');
    seleccionarPedidoYResolverDetalle(fixture);
    expect(fixture.componentInstance.pedido()).not.toBeNull();

    fixture.componentInstance.seleccionarTipoMovimiento('entrada');

    expect(fixture.componentInstance.pedido()).toBeNull();
    expect(fixture.componentInstance.pedidoBuscado()).toBe('');
    expect(fixture.componentInstance.filas()).toHaveLength(1);
    expect(fixture.componentInstance.filas()[0]).toMatchObject({
      productoTerminadoId: '',
      loteId: '',
      cantidad: '',
    });

    // guardar() ahora debe ir por el camino de movimiento generico, no al
    // PATCH de pendiente-entrega.
    httpMock.expectNone((r) => r.url === `${PEDIDOS_PREPARAR_BASE}/50/pendiente-entrega`);
  });

  it('seleccionarPedido cancela el GET anterior: elegir B mientras A seguia en vuelo no deja que A sobreescriba el resultado', () => {
    const fixture = openModal(
      [makeProductoDto()],
      [makePedidoResumenDto({ id: 50 }), makePedidoResumenDto({ id: 60, codigo: 'PED-000060' })],
    );

    fixture.componentInstance.seleccionarPedido('50');
    const reqA = httpMock.expectOne((r) => r.url === `${PEDIDOS_PREPARAR_BASE}/50`);

    fixture.componentInstance.seleccionarPedido('60');
    const reqB = httpMock.expectOne((r) => r.url === `${PEDIDOS_PREPARAR_BASE}/60`);

    // El unsubscribe() al elegir B cancela el GET de A — HttpTestingController
    // no deja flushear una request cancelada, asi que ni se intenta: con que
    // quede marcada "cancelled" ya confirma que una respuesta tardia de A no
    // podria aplicarse.
    expect(reqA.cancelled).toBe(true);

    reqB.flush(makePedidoDetalleDto({ id: 60, codigo: 'PED-000060' }));

    // El producto de B tambien resuelve por SKU, asi que dispara su propia
    // carga de lotes (ver seleccionarPedido) — se flushea para no dejarla
    // abierta.
    httpMock
      .expectOne((r) => r.url === LOTES_BASE && r.params.get('producto_terminado_id') === '256')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });

    expect(fixture.componentInstance.pedido()?.id).toBe(60);
    expect(fixture.componentInstance.motivoGeneral()).toBe('Pedido PED-000060');
  });

  it('loads productos con productoTerminadoId resuelto into the combobox options when opened', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.productosOptions()).toEqual([
      { value: '256', label: 'Pan de molde · 500 gr', secondary: 'FR-P3-PR2' },
    ]);
  });

  it('filters out productos sin productoTerminadoId resuelto (caso rarisimo)', () => {
    const fixture = openModal([
      makeProductoDto({ id: 8, sku: 'FR-P3-PR3', producto_terminado: null }),
    ]);

    expect(fixture.componentInstance.productosOptions()).toEqual([]);
  });

  it('resets the form with one empty fila and no errors when opened', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    expect(component.tipoMovimiento()).toBe('entrada');
    expect(component.motivoGeneral()).toBe('');
    expect(component.filas()).toEqual([
      { id: 1, productoTerminadoId: '', loteId: '', cantidad: '' },
    ]);
    expect(component.errores()).toEqual({});
    expect(component.cantidadProductosEnMovimiento()).toBe(0);
  });

  it('preloads the producto of the first fila and requests its active lotes when opened from a row ("Registrar movimiento" icon)', () => {
    const fixture = TestBed.createComponent(MovimientoProductoTerminadoFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('productoPreseleccionado', {
      id: 7,
      productoTerminadoId: 256,
      sku: 'FR-P3-PR2',
      productoNombre: 'Pan de molde',
      productoDescripcion: 'Pan de molde integral, bolsa sellada.',
      categoriaId: 2,
      categoriaNombre: 'Panadería',
      presentacionId: 2,
      presentacionCantidad: 500,
      presentacionUnidadMedida: 'gr',
      estado: true,
      stockActual: 250,
      stockMinimo: 50,
      stockMaximo: 400,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.filas()).toEqual([
      { id: 1, productoTerminadoId: '256', loteId: '', cantidad: '' },
    ]);

    httpMock
      .expectOne((request) => request.url === PRODUCTO_PRESENTACIONES_BASE)
      .flush({
        data: [makeProductoDto()],
        meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
      });
    httpMock
      .expectOne((request) => request.url === PEDIDOS_PREPARAR_BASE)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
    httpMock
      .expectOne(
        (request) =>
          request.url === LOTES_BASE && request.params.get('producto_terminado_id') === '256',
      )
      .flush({ data: [makeLoteDto()], meta: { total: 1, page: 1, limit: 100, total_pages: 1 } });

    expect(fixture.componentInstance.lotesDeFila(fixture.componentInstance.filas()[0])).toEqual([
      expect.objectContaining({ id: 1 }),
    ]);
  });

  it('does not preselect a fila when productoPreseleccionado has no productoTerminadoId (caso rarisimo)', () => {
    const fixture = TestBed.createComponent(MovimientoProductoTerminadoFormModal);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('productoPreseleccionado', {
      id: 8,
      productoTerminadoId: null,
      sku: 'FR-P3-PR3',
      productoNombre: 'Otro producto',
      productoDescripcion: null,
      categoriaId: 2,
      categoriaNombre: 'Panadería',
      presentacionId: 2,
      presentacionCantidad: 500,
      presentacionUnidadMedida: 'gr',
      estado: true,
      stockActual: 0,
      stockMinimo: 0,
      stockMaximo: null,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.filas()).toEqual([
      { id: 1, productoTerminadoId: '', loteId: '', cantidad: '' },
    ]);

    httpMock
      .expectOne((request) => request.url === PRODUCTO_PRESENTACIONES_BASE)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
    httpMock
      .expectOne((request) => request.url === PEDIDOS_PREPARAR_BASE)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
    httpMock.expectNone(LOTES_BASE);
  });

  it('adds and removes filas', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.agregarFila();
    expect(component.filas()).toEqual([
      { id: 1, productoTerminadoId: '', loteId: '', cantidad: '' },
      { id: 2, productoTerminadoId: '', loteId: '', cantidad: '' },
    ]);

    component.quitarFila(1);
    expect(component.filas()).toEqual([
      { id: 2, productoTerminadoId: '', loteId: '', cantidad: '' },
    ]);
  });

  it('requests the active lotes of the chosen producto and fills the select options (tipo entrada)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001' }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LTP-002' }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '1', label: 'FR-LTP-001', secondary: '50 disp.' },
      { value: '2', label: 'FR-LTP-002', secondary: '50 disp.' },
    ]);
  });

  it('on entrada, excludes lotes vencidos from the select options', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', estado: 'vencido' }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LTP-002', estado: 'activo' }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '2', label: 'FR-LTP-002', secondary: '50 disp.' },
    ]);
  });

  it('on entrada, includes lotes por_vencer in the select options (sigue siendo stock utilizable, bug reportado por el backend)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', estado: 'por_vencer' }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '1', label: 'FR-LTP-001', secondary: '50 disp.' },
    ]);
  });

  it('on entrada, excludes lotes agotados (sin stock) from the select options', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', estado: 'agotado', cantidad_actual: 0 }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LTP-002', estado: 'activo', cantidad_actual: 10 }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '2', label: 'FR-LTP-002', secondary: '10 disp.' },
    ]);
  });

  it('on ajuste, includes lotes agotados in the select options (corregir el conteo real igual aplica)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('ajuste');

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', estado: 'agotado', cantidad_actual: 0 }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '1', label: 'FR-LTP-001', secondary: '0 disp.' },
    ]);
  });

  it('does not send "estado" en el pedido de lotes (ese filtro es estricto y excluiria por_vencer — se filtra del lado del front)', () => {
    const fixture = openModal();

    fixture.componentInstance.seleccionarProductoDeFila(1, '256');

    const req = httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE && request.params.get('producto_terminado_id') === '256',
    );
    expect(req.request.params.has('estado')).toBe(false);
    expect(req.request.params.get('activo')).toBe('true');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
  });

  it('on ajuste, includes lotes vencidos in the select options', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('ajuste');

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', estado: 'vencido' }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LTP-002', estado: 'activo' }),
    ]);

    expect(component.loteOptionsDeFila(component.filas()[0])).toEqual([
      { value: '1', label: 'FR-LTP-001', secondary: '50 disp.' },
      { value: '2', label: 'FR-LTP-002', secondary: '50 disp.' },
    ]);
  });

  it('on salida, excludes lotes vencidos from the FEFO breakdown', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({
        id: 1,
        codigo_lote: 'FR-LTP-001',
        estado: 'vencido',
        cantidad_actual: 50,
        fecha_vencimiento: '2026-01-01',
      }),
      makeLoteDto({
        id: 2,
        codigo_lote: 'FR-LTP-002',
        estado: 'activo',
        cantidad_actual: 30,
        fecha_vencimiento: '2026-12-01',
      }),
    ]);
    component.actualizarCantidadDeFila(1, '20');

    const desglose = component.desgloseFefoDeFila(component.filas()[0]);

    expect(desglose.lineas).toEqual([{ texto: 'FR-LTP-002: −20', resultado: '10' }]);
  });

  it('clears the previously selected lote when the producto changes', () => {
    const fixture = openModal([
      makeProductoDto(),
      makeProductoDto({
        id: 8,
        sku: 'FR-P3-PR3',
        producto_terminado: { id: 257, stock_actual: 100, stock_minimo: 10, stock_maximo: 200 },
      }),
    ]);
    const component = fixture.componentInstance;
    seleccionarProductoYResolverLotes(fixture, 1, '256', [makeLoteDto()]);
    component.seleccionarLoteDeFila(1, '1');

    seleccionarProductoYResolverLotes(fixture, 1, '257', []);

    expect(component.filas()[0].loteId).toBe('');
  });

  it('defaults stockLoteDeFila to — and fills it once a lote is chosen (sin sufijo de unidad)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', cantidad_actual: 35 }),
    ]);

    expect(component.stockLoteDeFila(component.filas()[0])).toBe('—');

    component.seleccionarLoteDeFila(1, '1');

    expect(component.stockLoteDeFila(component.filas()[0])).toBe('35');
  });

  it('on ajuste, stockLoteDeFila shows la cantidad real tal cual (no la suma al lote)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('ajuste');

    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', cantidad_actual: 50 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');

    expect(component.stockLoteDeFila(component.filas()[0])).toBe('50');
    expect(component.cantidadActualLoteDeFila(component.filas()[0])).toBe('50');

    component.actualizarCantidadDeFila(1, '35');

    expect(component.stockLoteDeFila(component.filas()[0])).toBe('35');
  });

  it('does not refetch lotes for a producto already cached', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.agregarFila();
    seleccionarProductoYResolverLotes(fixture, 1, '256', [makeLoteDto()]);

    component.seleccionarProductoDeFila(2, '256');
    httpMock.expectNone((request) => request.url === LOTES_BASE);
  });

  it('simulates the FEFO breakdown across lotes for tipo salida', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', cantidad_actual: 50 }),
      makeLoteDto({ id: 2, codigo_lote: 'FR-LTP-002', cantidad_actual: 30 }),
    ]);
    component.actualizarCantidadDeFila(1, '80');

    const desglose = component.desgloseFefoDeFila(component.filas()[0]);

    expect(desglose).toEqual({
      lineas: [
        { texto: 'FR-LTP-001: −50', resultado: '0' },
        { texto: 'FR-LTP-002: −30', resultado: '0' },
      ],
      cargando: false,
      insuficiente: false,
    });
  });

  it('flags insuficiente when la cantidad excede la suma de todos los lotes activos', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', cantidad_actual: 50 }),
    ]);
    component.actualizarCantidadDeFila(1, '80');

    const desglose = component.desgloseFefoDeFila(component.filas()[0]);

    expect(desglose).toEqual({
      lineas: [{ texto: 'FR-LTP-001: −50', resultado: '0' }],
      cargando: false,
      insuficiente: true,
    });
  });

  it('shows — for stock actual/límite until a producto is selected on that fila', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const fila = component.filas()[0];

    expect(component.stockActualDeFila(fila)).toBe('—');
    expect(component.stockLimiteDeFila(fila)).toBe('—');

    seleccionarProductoYResolverLotes(fixture, 1, '256', []);
    const filaConProducto = component.filas()[0];

    expect(component.stockActualDeFila(filaConProducto)).toBe('250');
    expect(component.stockLimiteDeFila(filaConProducto)).toBe('400');
  });

  it('shows — for stock límite cuando stockMaximo es null (sin tope definido)', () => {
    const fixture = openModal([
      makeProductoDto({
        producto_terminado: { id: 256, stock_actual: 250, stock_minimo: 50, stock_maximo: null },
      }),
    ]);
    const component = fixture.componentInstance;
    seleccionarProductoYResolverLotes(fixture, 1, '256', []);

    expect(component.stockLimiteDeFila(component.filas()[0])).toBe('—');
  });

  it('shows stock mínimo as el límite for tipo salida, en vez del máximo', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarProductoYResolverLotes(fixture, 1, '256', []);

    expect(component.stockLimiteDeFila(component.filas()[0])).toBe('50');
  });

  it('computes stock resultante adding la cantidad for entrada', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    seleccionarProductoYResolverLotes(fixture, 1, '256', []);
    component.actualizarCantidadDeFila(1, '30');

    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('280');
  });

  it('computes stock resultante subtracting la cantidad for salida', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('salida');
    seleccionarProductoYResolverLotes(fixture, 1, '256', []);
    component.actualizarCantidadDeFila(1, '30');

    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('220');
  });

  it('on ajuste, stockResultanteDeFila usa el delta contra el lote (cantidad real − cantidad actual)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.seleccionarTipoMovimiento('ajuste');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', cantidad_actual: 50 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '35');

    // Delta = 35 − 50 = −15 → 250 − 15 = 235 (no 250 + 35).
    expect(component.stockResultanteDeFila(component.filas()[0])).toBe('235');
  });

  it('does not call the backend and marks required fields for an empty entrada form (incluye lote)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const guardados: unknown[] = [];
    let closed = 0;
    component.saved.subscribe((movimientos) => guardados.push(movimientos));
    component.closed.subscribe(() => closed++);

    component.guardar();

    httpMock.expectNone(`${MOVIMIENTOS_BASE}/entrada`);
    expect(guardados).toEqual([]);
    expect(closed).toBe(0);
    expect(component.errores()).toMatchObject({
      motivoGeneral: 'Requerido.',
      porFila: {
        1: {
          productoTerminadoId: 'Selecciona un producto.',
          loteId: 'Selecciona un lote.',
          cantidad: 'Debe ser mayor a 0.',
        },
      },
    });
  });

  it('posts a batch entrada with lote_producto_terminado_id and emits saved/closed on success', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    const guardados: unknown[][] = [];
    let closed = 0;
    component.saved.subscribe((movimientos) => guardados.push(movimientos));
    component.closed.subscribe(() => closed++);

    component.motivoGeneral.set('Producción del día');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();
    expect(component.guardando()).toBe(true);

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/entrada`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { lote_producto_terminado_id: 1, cantidad: 30, razon: 'Producción del día' },
    ]);
    req.flush([makeMovimientoRespuestaDto()]);

    expect(component.guardando()).toBe(false);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject([{ id: 1, codigoLote: 'FR-LTP-001' }]);
    expect(closed).toBe(1);
  });

  it('posts a batch salida with producto_terminado_id instead of lote_producto_terminado_id (sin loteId)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.seleccionarTipoMovimiento('salida');
    component.motivoGeneral.set('Despacho a cliente');
    seleccionarProductoYResolverLotes(fixture, 1, '256', []);
    component.actualizarCantidadDeFila(1, '10');

    component.guardar();

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/salida`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { producto_terminado_id: 256, cantidad: 10, razon: 'Despacho a cliente' },
    ]);
    req.flush([makeMovimientoRespuestaDto({ tipo: 'salida' })]);
  });

  it('posts a batch ajuste with the signed delta, not la cantidad real que escribió la persona', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.seleccionarTipoMovimiento('ajuste');
    component.motivoGeneral.set('Conteo físico');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', cantidad_actual: 50 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '35');

    component.guardar();

    const req = httpMock.expectOne(`${MOVIMIENTOS_BASE}/ajuste`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { lote_producto_terminado_id: 1, cantidad: -15, razon: 'Conteo físico' },
    ]);
    req.flush([makeMovimientoRespuestaDto({ tipo: 'ajuste', cantidad: -15 })]);
  });

  it('blocks guardar on ajuste when la cantidad real es igual a la actual (sin cambio)', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.seleccionarTipoMovimiento('ajuste');
    component.motivoGeneral.set('Conteo físico');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [
      makeLoteDto({ id: 1, codigo_lote: 'FR-LTP-001', cantidad_actual: 50 }),
    ]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '50');

    component.guardar();

    httpMock.expectNone(`${MOVIMIENTOS_BASE}/ajuste`);
    expect(component.errorDeFila(1, 'cantidad')).toBe('La cantidad no cambió.');
  });

  it('shows the fila-specific error message the backend sends back for a failed batch', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.motivoGeneral.set('Producción del día');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();
    httpMock
      .expectOne(`${MOVIMIENTOS_BASE}/entrada`)
      .flush(
        { statusCode: 404, message: 'Lote no encontrado (lote_producto_terminado_id=1)' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(component.guardando()).toBe(false);
    expect(component.errorGeneral()).toBe('Lote no encontrado (lote_producto_terminado_id=1)');
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.motivoGeneral.set('Producción del día');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();
    httpMock
      .expectOne(`${MOVIMIENTOS_BASE}/entrada`)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(component.errorGeneral()).toBe('No tiene permisos para registrar movimientos.');
  });

  it('shows a generic error for an unexpected server response', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;

    component.motivoGeneral.set('Producción del día');
    seleccionarProductoYResolverLotes(fixture, 1, '256', [makeLoteDto({ id: 1 })]);
    component.seleccionarLoteDeFila(1, '1');
    component.actualizarCantidadDeFila(1, '30');

    component.guardar();
    httpMock
      .expectOne(`${MOVIMIENTOS_BASE}/entrada`)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(component.errorGeneral()).toBe(
      'No se pudo registrar el movimiento. Intente nuevamente.',
    );
  });
});
