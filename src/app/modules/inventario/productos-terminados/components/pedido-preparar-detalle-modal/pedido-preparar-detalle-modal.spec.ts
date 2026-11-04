import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideEye, LucidePackageCheck } from '@lucide/angular';
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

  function create(modo: 'ver' | 'preparar' = 'ver'): ComponentFixture<PedidoPrepararDetalleModal> {
    const fixture = TestBed.createComponent(PedidoPrepararDetalleModal);
    fixture.componentRef.setInput('modo', modo);
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
    expect(fixture.componentInstance.disponibilidadLabel()).toBe('Stock completo');
    expect(fixture.componentInstance.disponibilidadTono()).toBe('success');
    const [fila] = fixture.componentInstance.filas();
    expect(fila).toMatchObject({
      producto: 'Queso fresco',
      sku: 'SKU-1',
      solicitado: 10,
      solicitadoMostrado: '10 unid.',
      stockDisponible: 15,
      stockDisponibleMostrado: '15 unid.',
    });
  });

  it('headerIcon es Eye en modo ver y PackageCheck en modo preparar', () => {
    const verFixture = create('ver');
    expect(verFixture.componentInstance.headerIcon()).toBe(LucideEye);

    const prepararFixture = create('preparar');
    expect(prepararFixture.componentInstance.headerIcon()).toBe(LucidePackageCheck);
  });

  it('en modo "ver" siempre muestra la tabla de solo lectura y sin acciones, sin importar el estado del pedido', () => {
    for (const estado of ['en_espera_inventario', 'en_preparacion'] as const) {
      const fixture = create('ver');
      fixture.componentRef.setInput('pedidoId', 1042);
      fixture.detectChanges();
      httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto({ estado }));
      fixture.detectChanges();

      const headers = fixture.componentInstance.columnas().map((c) => c.header);
      expect(headers).toContain('Stock disponible');
      expect(headers).not.toContain('Cantidad preparada');
      expect(fixture.componentInstance.textoAyuda()).toBeNull();

      const element: HTMLElement = fixture.nativeElement;
      const botones = Array.from(element.querySelectorAll('button')).map((b) =>
        b.textContent?.trim(),
      );
      expect(botones).not.toContain('Iniciar preparación');
      expect(botones).not.toContain('Marcar pendiente de entrega');
    }
  });

  it('en modo "ver" con el pedido ya "pendiente_entrega" oculta el campo Disponibilidad y no muestra ninguna columna de stock (ni badge ni numero)', () => {
    const fixture = create('ver');
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    const base = makeDetalleDto();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(
      makeDetalleDto({
        estado: 'pendiente_entrega',
        disponibilidad: 'sin_stock',
        items: [{ ...base.items[0], stock_disponible: 0 }],
      }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.pedidoEntregado()).toBe(true);
    // La tabla queda solo con Producto/Presentacion/Solicitado — el backend
    // revirtio "Stock actual"/"Stock anterior" (el calculo usaba stock en
    // vivo y el numero se movia solo con otros pedidos del mismo producto).
    const headers = fixture.componentInstance.columnas().map((c) => c.header);
    expect(headers).toEqual(['Producto', 'Presentación', 'Solicitado']);

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).not.toContain('Disponibilidad');
    expect(element.textContent).not.toContain('Sin stock');
    expect(element.textContent).not.toContain('Stock completo');
    expect(element.textContent).not.toContain('Stock insuficiente');
    expect(element.textContent).not.toContain('Stock actual');
    expect(element.textContent).not.toContain('Stock anterior');
  });

  it('en modo "preparar" la tabla es editable, tambien muestra el stock disponible (sin badge) y explica el ajuste de cantidades', () => {
    const fixture = create('preparar');
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
    fixture.detectChanges();

    const columnas = fixture.componentInstance.columnas();
    expect(columnas.map((c) => c.header)).toContain('Cantidad preparada');
    const colStock = columnas.find((c) => c.key === 'stockDisponibleMostrado');
    expect(colStock?.header).toBe('Stock disponible');
    expect(colStock?.cellTemplate).toBeUndefined(); // plano, sin badge/cellTemplate
    expect(fixture.componentInstance.textoAyuda()).toContain('Ajusta la cantidad preparada');

    const [fila] = fixture.componentInstance.filas();
    expect(fila.stockDisponibleMostrado).toBe('15 unid.');

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('15 unid.');
    const button = Array.from(element.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Marcar pendiente de entrega',
    );
    expect(button).toBeTruthy();
  });

  it.each(['parcial', 'sin_stock'] as const)(
    'en modo "preparar" deshabilita "Marcar pendiente de entrega" cuando la disponibilidad es %s (mismo criterio que "Iniciar preparación")',
    (disponibilidad) => {
      const fixture = create('preparar');
      fixture.componentRef.setInput('pedidoId', 1042);
      fixture.detectChanges();
      httpMock
        .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
        .flush(makeDetalleDto({ estado: 'en_preparacion', disponibilidad }));
      fixture.detectChanges();

      expect(fixture.componentInstance.entregaBloqueada()).toBe(true);
      expect(fixture.componentInstance.textoAyuda()).toContain('No se puede confirmar la entrega');

      const element: HTMLElement = fixture.nativeElement;
      const button = Array.from(element.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Marcar pendiente de entrega',
      );
      expect(button?.disabled).toBe(true);

      fixture.componentInstance.avanzarEstado();
      httpMock.expectNone((r) => r.method === 'PATCH');
    },
  );

  it('filas() usa la cantidad solicitada como cantidadPreparada por defecto', () => {
    const fixture = create('preparar');
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
    const fixture = create('preparar');
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

  it('badges la fila sin stock como "Stock insuficiente" (danger) y la que si alcanza como "Stock completo" (success)', () => {
    const fixture = create();
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    const base = makeDetalleDto();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(
      makeDetalleDto({
        disponibilidad: 'parcial',
        items: [
          base.items[0],
          { ...base.items[0], id: 2, producto_presentacion_id: 20, stock_disponible: 0 },
        ],
      }),
    );
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const [filaCompleta, filaInsuficiente] = component.filas();
    expect(component.disponibilidadFilaEstado(filaCompleta)).toBe('Stock completo');
    expect(component.disponibilidadFilaTono(filaCompleta)).toBe('success');
    expect(component.disponibilidadFilaEstado(filaInsuficiente)).toBe('Stock insuficiente');
    expect(component.disponibilidadFilaTono(filaInsuficiente)).toBe('danger');

    // El numero va aparte del badge (apilado arriba), no repetido adentro.
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain(`${filaCompleta.stockDisponible} unid.`);
    expect(element.textContent).toContain('0 unid.');
    expect(element.textContent).toContain('Stock insuficiente');
    expect(element.textContent).toContain('Stock completo');
    expect(element.textContent).not.toContain('se necesita stock suficiente');
    expect(element.textContent).not.toContain('Actualizar disponibilidad');

    // La disponibilidad a nivel de PEDIDO (arriba) ahora es un badge de 3
    // estados, independiente del badge binario por fila.
    expect(component.disponibilidadLabel()).toBe('Stock parcial');
    expect(component.disponibilidadTono()).toBe('warning');
  });

  it('avanzarEstado no hace nada en modo "ver" (las transiciones ya no viven en este modal)', () => {
    const fixture = create('ver');
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`).flush(makeDetalleDto());
    fixture.detectChanges();

    fixture.componentInstance.avanzarEstado();
    httpMock.expectNone((r) => r.method === 'PATCH');
  });

  it('avanzarEstado en modo "preparar" manda las cantidades preparadas (con ediciones) y cierra el modal solo al confirmar', () => {
    const fixture = create('preparar');
    fixture.componentRef.setInput('pedidoId', 1042);
    fixture.detectChanges();
    httpMock
      .expectOne(`${PEDIDOS_PREPARAR_BASE}/1042`)
      .flush(makeDetalleDto({ estado: 'en_preparacion' }));
    fixture.detectChanges();

    fixture.componentInstance.actualizarCantidadPreparada(1, '8');

    let actualizadoEmitido = false;
    fixture.componentInstance.actualizado.subscribe(() => (actualizadoEmitido = true));
    let cerrado = false;
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));
    fixture.componentInstance.avanzarEstado();

    const req = httpMock.expectOne(`${PEDIDOS_PREPARAR_BASE}/1042/pendiente-entrega`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      items: [{ producto_presentacion_id: 10, cantidad_preparada: 8 }],
    });
    req.flush(makeDetalleDto({ estado: 'pendiente_entrega' }));

    // Al confirmar con exito ya no queda nada mas que ajustar: el modal se
    // cierra solo (un segundo click sobre el mismo pedido ya transicionado
    // hubiera fallado si se dejaba abierto).
    expect(actualizadoEmitido).toBe(true);
    expect(cerrado).toBe(true);
    expect(fixture.componentInstance.pedido()).toBeNull();
  });

  it('avanzarEstado en modo "preparar" muestra un mensaje de stock insuficiente en 409 y no recarga', () => {
    const fixture = create('preparar');
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

  it('avanzarEstado en modo "preparar" muestra un mensaje distinto en 400', () => {
    const fixture = create('preparar');
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
