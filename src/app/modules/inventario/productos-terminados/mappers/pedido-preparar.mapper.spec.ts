import {
  IndicadoresPedidosPorPrepararDto,
  PedidoPrepararDetalleDto,
  PedidoPrepararResumenDto,
  PedidosPorPrepararPageDto,
} from '../interfaces/pedido-preparar-dto.interface';
import {
  etiquetaAccionSiguienteEstado,
  etiquetaDisponibilidadPedidoPreparar,
  etiquetaEstadoPedidoPreparar,
  siguienteEstadoPedidoPreparar,
  toPedidoPreparar,
  toPedidoPrepararDetalle,
  toPedidosPorPrepararPagina,
  toResumenPedidosPorPreparar,
  tonoDisponibilidadPedidoPreparar,
  tonoEstadoPedidoPreparar,
} from './pedido-preparar.mapper';

const RESUMEN_DTO: PedidoPrepararResumenDto = {
  id: 1,
  codigo: 'PED-000001',
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
};

describe('pedido-preparar.mapper', () => {
  it('etiquetaEstadoPedidoPreparar y tonoEstadoPedidoPreparar mapean los 3 estados', () => {
    expect(etiquetaEstadoPedidoPreparar('en_espera_inventario')).toBe('En espera de inventario');
    expect(etiquetaEstadoPedidoPreparar('en_preparacion')).toBe('En preparación');
    expect(etiquetaEstadoPedidoPreparar('pendiente_entrega')).toBe('Pendiente a entrega');

    expect(tonoEstadoPedidoPreparar('en_espera_inventario')).toBe('warning');
    expect(tonoEstadoPedidoPreparar('en_preparacion')).toBe('info');
    expect(tonoEstadoPedidoPreparar('pendiente_entrega')).toBe('success');
  });

  it('toPedidoPreparar aplana cliente.nombre y copia productos/unidades', () => {
    const resultado = toPedidoPreparar(RESUMEN_DTO);
    expect(resultado).toEqual({
      id: 1,
      codigo: 'PED-000001',
      estado: 'en_espera_inventario',
      fechaCreacion: '2026-09-12T09:05:00.000Z',
      clienteNombre: 'Supermercados Andina',
      cantidadProductos: 3,
      cantidadUnidades: 210,
      disponibilidad: 'completo',
    });
  });

  it('toPedidosPorPrepararPagina mapea data + meta', () => {
    const pageDto: PedidosPorPrepararPageDto = {
      data: [RESUMEN_DTO],
      meta: { total: 1, page: 1, limit: 10, total_pages: 1 },
    };
    const resultado = toPedidosPorPrepararPagina(pageDto);
    expect(resultado.pedidos).toHaveLength(1);
    expect(resultado.pedidos[0].codigo).toBe('PED-000001');
    expect(resultado.total).toBe(1);
    expect(resultado.pagina).toBe(1);
    expect(resultado.totalPaginas).toBe(1);
  });

  it('toResumenPedidosPorPreparar renombra los 3 estados', () => {
    const dto: IndicadoresPedidosPorPrepararDto = {
      en_espera_inventario: 2,
      en_preparacion: 1,
      pendiente_entrega: 1,
    };
    expect(toResumenPedidosPorPreparar(dto)).toEqual({
      enEsperaInventario: 2,
      enPreparacion: 1,
      pendienteEntrega: 1,
    });
  });

  it('toPedidoPrepararDetalle aplana cliente, mapea items y convierte pago.monto a number', () => {
    const dto: PedidoPrepararDetalleDto = {
      id: 1,
      codigo: 'PED-000001',
      cliente: { id: 'uuid-1', nombre: 'Supermercados Andina' },
      origen: 'portal',
      estado: 'en_preparacion',
      tipo_entrega: 'delivery',
      direccion_entrega: 'Av. Siempre Viva 123',
      total: '1250.50',
      fecha_entrega: null,
      created_at: '2026-09-12T09:05:00.000Z',
      updated_at: '2026-09-12T09:10:00.000Z',
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
    };

    const resultado = toPedidoPrepararDetalle(dto);
    expect(resultado.clienteNombre).toBe('Supermercados Andina');
    expect(resultado.cantidadProductos).toBe(1);
    expect(resultado.cantidadUnidades).toBe(10);
    expect(resultado.disponibilidad).toBe('completo');
    expect(resultado.items).toEqual([
      {
        id: 1,
        productoPresentacionId: 10,
        sku: 'SKU-1',
        producto: 'Queso fresco',
        presentacion: '1 kg',
        cantidad: 10,
        stockDisponible: 15,
      },
    ]);
    expect(resultado.pago).toEqual({
      metodoPago: 'efectivo',
      monto: 120.5,
      numeroOperacion: null,
      fechaPago: '2026-09-12T09:06:00.000Z',
    });
  });

  it('toPedidoPrepararDetalle deja pago en null cuando el DTO no trae pago', () => {
    const dto: PedidoPrepararDetalleDto = {
      id: 1,
      codigo: 'PED-000001',
      cliente: { id: 'uuid-1', nombre: 'Cafetería Luján' },
      origen: 'manual',
      estado: 'pendiente_entrega',
      tipo_entrega: 'recojo_tienda',
      direccion_entrega: null,
      total: '52.00',
      fecha_entrega: null,
      created_at: '2026-09-12T08:20:00.000Z',
      updated_at: '2026-09-12T08:25:00.000Z',
      items: [],
      disponibilidad: 'sin_stock',
      pago: null,
    };
    expect(toPedidoPrepararDetalle(dto).pago).toBeNull();
  });

  it('etiquetaDisponibilidadPedidoPreparar y tonoDisponibilidadPedidoPreparar mapean los 3 estados', () => {
    expect(etiquetaDisponibilidadPedidoPreparar('completo')).toBe('Stock completo');
    expect(etiquetaDisponibilidadPedidoPreparar('parcial')).toBe('Stock parcial');
    expect(etiquetaDisponibilidadPedidoPreparar('sin_stock')).toBe('Sin stock');

    expect(tonoDisponibilidadPedidoPreparar('completo')).toBe('success');
    expect(tonoDisponibilidadPedidoPreparar('parcial')).toBe('warning');
    expect(tonoDisponibilidadPedidoPreparar('sin_stock')).toBe('danger');
  });

  it('siguienteEstadoPedidoPreparar avanza en_espera_inventario -> en_preparacion -> pendiente_entrega -> null', () => {
    expect(siguienteEstadoPedidoPreparar('en_espera_inventario')).toBe('en_preparacion');
    expect(siguienteEstadoPedidoPreparar('en_preparacion')).toBe('pendiente_entrega');
    expect(siguienteEstadoPedidoPreparar('pendiente_entrega')).toBeNull();
  });

  it('etiquetaAccionSiguienteEstado devuelve el texto del boton o null', () => {
    expect(etiquetaAccionSiguienteEstado('en_espera_inventario')).toBe('Iniciar preparación');
    expect(etiquetaAccionSiguienteEstado('en_preparacion')).toBe('Marcar pendiente de entrega');
    expect(etiquetaAccionSiguienteEstado('pendiente_entrega')).toBeNull();
  });
});
