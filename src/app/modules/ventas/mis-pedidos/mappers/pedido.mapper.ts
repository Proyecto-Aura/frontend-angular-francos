import { ProductoPresentacionFilaDto } from '../../catalogo/interfaces/producto-dto.interface';
import {
  ClienteDto,
  CrearPedidoRequest,
  PedidoDetalleDto,
  PedidoResumenDto,
  PersonaDto,
} from '../interfaces/pedido-dto.interface';
import {
  ClienteOpcion,
  FiltrosPedidos,
  PedidoDetalle,
  PedidoFila,
  PedidoFormModel,
  PresentacionOpcion,
  metodoPagoLabel,
  origenLabel,
  tipoEntregaLabel,
} from '../interfaces/pedido.interface';

export function toPedidoFila(dto: PedidoResumenDto): PedidoFila {
  return {
    id: dto.id,
    codigo: dto.codigo,
    origen: origenLabel(dto.origen),
    cliente: dto.cliente.nombre,
    metodoPago: metodoPagoLabel(dto.metodo_pago),
    total: dto.total,
    tipoEntrega: tipoEntregaLabel(dto.tipo_entrega),
    estado: dto.estado,
    creado: new Date(dto.created_at),
  };
}

export function toPedidoDetalle(dto: PedidoDetalleDto): PedidoDetalle {
  return {
    id: dto.id,
    codigo: dto.codigo,
    cliente: dto.cliente.nombre,
    origen: origenLabel(dto.origen),
    estado: dto.estado,
    tipoEntrega: tipoEntregaLabel(dto.tipo_entrega),
    direccion: dto.direccion_entrega,
    total: dto.total,
    creado: new Date(dto.created_at),
    items: dto.items.map((i) => ({
      sku: i.sku,
      nombre: `${i.producto} ${i.presentacion}`,
      cantidad: i.cantidad,
      precioUnit: i.precio_unitario,
      precioAplicado: i.precio_aplicado,
      subtotal: i.subtotal,
    })),
    pago: dto.pago
      ? {
          metodo: metodoPagoLabel(dto.pago.metodo_pago),
          monto: dto.pago.monto,
          operacion: dto.pago.numero_operacion,
          fecha: new Date(dto.pago.fecha_pago),
          comprobante: dto.pago.comprobante,
        }
      : null,
  };
}

/** Parámetros de GET /pedidos: solo los filtros con valor (RF-A037). */
export function toListarParams(
  filtros: FiltrosPedidos,
  page: number,
  limit: number,
): Record<string, string | number> {
  return {
    page,
    limit,
    ...(filtros.estado ? { estado: filtros.estado } : {}),
    ...(filtros.origen ? { origen: filtros.origen } : {}),
    ...(filtros.desde ? { fecha_desde: filtros.desde } : {}),
    ...(filtros.hasta ? { fecha_hasta: filtros.hasta } : {}),
  };
}

/** Clientes activos con el nombre de su persona (o la razón social si es empresa). */
export function toClienteOpciones(clientes: ClienteDto[], personas: PersonaDto[]): ClienteOpcion[] {
  const personaPorId = new Map(personas.map((p) => [p.id, p]));

  return clientes
    .filter((c) => c.estado)
    .flatMap((c) => {
      const persona = personaPorId.get(c.persona_id);
      if (!persona) return [];
      return [
        {
          id: c.id,
          nombre:
            c.razon_social ??
            `${persona.nombres} ${persona.apellido_paterno} ${persona.apellido_materno}`,
          documento: persona.numero_documento,
          direccion: persona.direccion ?? '',
        },
      ];
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Presentaciones activas de productos activos, que son las que se pueden vender. */
export function toPresentacionOpciones(filas: ProductoPresentacionFilaDto[]): PresentacionOpcion[] {
  return filas
    .filter((f) => f.estado && f.producto.estado)
    .map((f) => ({
      id: f.id,
      sku: f.sku,
      nombre: `${f.producto.nombre} ${f.presentacion.cantidad} ${f.presentacion.unidad_medida}`,
      precioUnit: f.precio_unitario,
      precioMayor: f.precio_mayorista,
      umbral: f.umbral_mayorista,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function toCrearPedidoRequest(
  form: PedidoFormModel,
  culqiToken: string | null,
): CrearPedidoRequest {
  return {
    cliente_id: form.clienteId,
    items: form.items.map((i) => ({
      producto_presentacion_id: Number(i.presentacionId),
      cantidad: Number(i.cantidad),
    })),
    tipo_entrega: form.tipoEntrega,
    ...(form.tipoEntrega === 'delivery' ? { direccion_entrega: form.direccion.trim() } : {}),
    metodo_pago: form.metodoPago,
    ...(culqiToken ? { culqi_token: culqiToken } : {}),
  };
}
