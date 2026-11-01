import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PedidoPrepararDetalleDto } from '../../interfaces/pedido-preparar-dto.interface';
import { PedidoPrepararDetalleModal } from './pedido-preparar-detalle-modal';

const PEDIDOS_PREPARAR_BASE = `${environment.apiUrl}/inventario/pedidos`;

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

describe('PedidoPrepararDetalleModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<PedidoPrepararDetalleModal> {
    const fixture = TestBed.createComponent(PedidoPrepararDetalleModal);
    fixture.detectChanges();
    return fixture;
  }

  it('does not request anything while closed (pedidoId null)', () => {
    create();
    httpMock.expectNone(`${PEDIDOS_PREPARAR_BASE}/1042`);
  });

  it('requests the pedido when pedidoId is set', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();

    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    expect(fixture.componentInstance.pedido()?.codigo).toBe('PED-001042');
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('builds campos y filas desde el detalle', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    const campos = fixture.componentInstance.campos();
    expect(campos).toContainEqual({ label: 'Cliente', value: 'Supermercados Andina' });
    expect(campos).toContainEqual({ label: 'Productos', value: '1 productos' });
    expect(campos).toContainEqual({ label: 'Unidades', value: '10' });
    expect(campos).toContainEqual({ label: 'Disponibilidad', value: 'Stock completo' });
    const [fila] = fixture.componentInstance.filas();
    expect(fila).toMatchObject({
      producto: 'Queso fresco',
      sku: 'SKU-1',
      solicitado: 10,
      stockDisponible: 15,
    });
  });

  it('textoAyuda solo se muestra mientras el pedido esta en_espera_inventario', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    expect(fixture.componentInstance.textoAyuda()).toContain(
      'Inicia la preparación para registrar',
    );
  });

  it('textoAyuda explica el ajuste de cantidades mientras el pedido esta en_preparacion', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.textoAyuda()).toContain('Ajusta la cantidad preparada');
  });

  it('textoAyuda es null cuando el pedido ya esta pendiente_entrega', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'pendiente_entrega' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.textoAyuda()).toBeNull();
  });

  it('columnas muestra "Cantidad preparada" en_preparacion y "Stock disponible" en los demas estados', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    let headers = fixture.componentInstance.columnas().map((c) => c.header);
    expect(headers).toContain('Stock disponible');
    expect(headers).not.toContain('Cantidad preparada');

    fixture.componentRef.setInput('pedidoId', 2001);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/2001`)
      .flush(makeDetalleDto({ id: 2001, estado: 'en_preparacion' }));
    fixture.detectChanges();

    headers = fixture.componentInstance.columnas().map((c) => c.header);
    expect(headers).toContain('Cantidad preparada');
    expect(headers).not.toContain('Stock disponible');
  });

  it('filas() usa la cantidad solicitada como cantidadPreparada por defecto', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
    fixture.detectChanges();

    const [fila] = fixture.componentInstance.filas();
    expect(fila.cantidadPreparada).toBe(10);
  });

  it('actualizarCantidadPreparada cambia el valor de esa fila sin tocar las demas', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(
      makeDetalleDto({
        estado: 'en_preparacion',
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
          {
            id: 2,
            producto_presentacion_id: 20,
            sku: 'SKU-2',
            producto: 'Yogurt natural',
            presentacion: '1 L',
            cantidad: 5,
            precio_unitario: '8.00',
            precio_aplicado: '8.00',
            subtotal: '40.00',
            stock_disponible: 30,
          },
        ],
      }),
    );
    fixture.detectChanges();

    fixture.componentInstance.actualizarCantidadPreparada(1, '7');

    const filas = fixture.componentInstance.filas();
    expect(filas.find((f) => f.id === 1)?.cantidadPreparada).toBe(7);
    expect(filas.find((f) => f.id === 2)?.cantidadPreparada).toBe(5);
  });

  it('shows an error state with retry when the request fails', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();

    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(true);
  });

  it('accionSiguiente ofrece "Iniciar preparación" para un pedido en_espera_inventario', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    expect(fixture.componentInstance.accionSiguiente()).toBe('Iniciar preparación');
  });

  it.each([0, 9])(
    'blocks preparation when one item lacks stock (%s available), even if another has enough',
    (stock) => {
      const fixture = create();
      fixture.componentRef.setInput('pedidoId', 1042);
      fixture.detectChanges();
      const base = makeDetalleDto();
      httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(
        makeDetalleDto({
          disponibilidad: 'insuficiente',
          items: [
            base.items[0],
            {
              ...base.items[0],
              id: 2,
              producto_presentacion_id: 20,
              producto: 'Yogurt',
              sku: 'SKU-2',
              stock_disponible: stock,
            },
          ],
        }),
      );
      fixture.detectChanges();
      const component = fixture.componentInstance;
      expect(component.inicioBloqueado()).toBe(true);
      expect(component.faltantesStock()).toHaveLength(1);
      const element: HTMLElement = fixture.nativeElement;
      const button = Array.from(element.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Iniciar preparación',
      );
      expect(button?.disabled).toBe(true);
      expect(element.textContent).toContain(`faltan ${10 - stock} unid.`);
      expect(component.textoAyuda()).toBeNull();
      component.avanzarEstado();
      httpMock.expectNone((r) => r.method === 'PATCH');
    },
  );

  it('enables preparation after refreshing sufficient stock, including exact stock', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    const base = makeDetalleDto();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(
        makeDetalleDto({
          disponibilidad: 'insuficiente',
          items: [{ ...base.items[0], stock_disponible: 0 }],
        }),
      );
    fixture.detectChanges();
    fixture.componentInstance.reintentar();
    fixture.componentInstance.avanzarEstado();
    httpMock.expectNone((r) => r.method === 'PATCH');
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ items: [{ ...base.items[0], stock_disponible: 10 }] }));
    fixture.detectChanges();
    expect(fixture.componentInstance.inicioBloqueado()).toBe(false);
    fixture.componentInstance.avanzarEstado();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/en-preparacion`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
  });

  it('accionSiguiente es null para un pedido pendiente_entrega', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'pendiente_entrega' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.accionSiguiente()).toBeNull();
  });

  it('avanzarEstado hace PATCH en-preparacion y actualiza el pedido con la respuesta, emitiendo actualizado', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    let actualizadoEmitido = false;
    fixture.componentInstance.actualizado.subscribe(() => (actualizadoEmitido = true));
    fixture.componentInstance.avanzarEstado();

    const req = httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/en-preparacion`);
    expect(req.request.method).toBe('PATCH');
    req.flush(makeDetalleDto({ estado: 'en_preparacion' }));

    expect(fixture.componentInstance.pedido()?.estado).toBe('en_preparacion');
    expect(actualizadoEmitido).toBe(true);
  });

  it('avanzarEstado muestra un mensaje especifico en 409 y refresca', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    fixture.componentInstance.avanzarEstado();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/en-preparacion`)
      .flush('conflict', { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorAvance()).toContain('ya cambió de estado');
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.errorAvance()).toContain('ya cambió de estado');
    expect(fixture.componentInstance.pedido()?.estado).toBe('en_preparacion');
  });

  it('avanzarEstado en en_preparacion manda las cantidades preparadas (con ediciones) y actualiza el pedido', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
    fixture.detectChanges();

    fixture.componentInstance.actualizarCantidadPreparada(1, '8');

    let actualizadoEmitido = false;
    fixture.componentInstance.actualizado.subscribe(() => (actualizadoEmitido = true));
    fixture.componentInstance.avanzarEstado();

    const req = httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/pendiente-entrega`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      items: [{ producto_presentacion_id: 10, cantidad_preparada: 8 }],
    });
    req.flush(makeDetalleDto({ estado: 'pendiente_entrega' }));

    expect(fixture.componentInstance.pedido()?.estado).toBe('pendiente_entrega');
    expect(actualizadoEmitido).toBe(true);
  });

  it('avanzarEstado en en_preparacion muestra un mensaje de stock insuficiente en 409 y no recarga', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
    fixture.detectChanges();

    fixture.componentInstance.avanzarEstado();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/pendiente-entrega`)
      .flush('conflict', { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorAvance()).toContain('No hay stock suficiente');
    // No se dispara un GET de recarga: no queremos perder lo que el
    // operario esta editando por un conflicto de stock.
    httpMock.expectNone(`${PEDIDOS_PREPARAR_BASE}/1042`);
  });

  it('avanzarEstado en en_preparacion muestra un mensaje distinto en 400', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
    fixture.detectChanges();

    fixture.componentInstance.avanzarEstado();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/pendiente-entrega`)
      .flush('bad request', { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.errorAvance()).toContain('no coinciden');
  });

  it('emits closed and clears its state on cerrar()', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.cerrar();

    expect(cerrado).toBe(true);
    expect(fixture.componentInstance.pedido()).toBeNull();
  });
});
