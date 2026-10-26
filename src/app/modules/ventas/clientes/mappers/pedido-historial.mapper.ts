import { PedidoResumenDto } from '../../mis-pedidos/interfaces/pedido-dto.interface';
import {
  estadoLabel,
  estadoTone,
  money,
  tipoEntregaLabel,
} from '../../mis-pedidos/interfaces/pedido.interface';
import { PedidoHistorial } from '../interfaces/pedido-historial.interface';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const PARTES_FECHA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  day: '2-digit',
  month: 'numeric',
  year: 'numeric',
});

/** «09 Sep 2026», en hora de Lima. */
function formatearFecha(fecha: Date): string {
  const partes = Object.fromEntries(
    PARTES_FECHA.formatToParts(fecha).map((p) => [p.type, p.value]),
  );
  return `${partes['day']} ${MESES[Number(partes['month']) - 1]} ${partes['year']}`;
}

/** Fila de GET /pedidos -> pedido del historial del cliente. */
export function toPedidoHistorial(dto: PedidoResumenDto): PedidoHistorial {
  const creado = new Date(dto.created_at);

  return {
    id: dto.id,
    codigo: dto.codigo,
    fecha: formatearFecha(creado),
    creado,
    tipoEntrega: tipoEntregaLabel(dto.tipo_entrega),
    total: money(dto.total),
    estado: estadoLabel(dto.estado),
    tono: estadoTone(dto.estado),
  };
}

/** Orden del historial: del pedido más reciente al más antiguo. */
export function masReciente(a: PedidoHistorial, b: PedidoHistorial): number {
  return b.creado.getTime() - a.creado.getTime();
}
