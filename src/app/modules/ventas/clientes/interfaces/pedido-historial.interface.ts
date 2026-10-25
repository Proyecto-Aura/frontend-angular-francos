import { BadgeTone } from '../../../../shared/ds/badge/badge';

/** Pedido finalizado de un cliente, listo para mostrarse en su detalle (HU-A-006). */
export interface PedidoHistorial {
  id: number;
  codigo: string;
  /** DD/MM/AAAA, en hora de Lima. */
  fecha: string;
  creado: Date;
  tipoEntrega: string;
  /** Monto ya formateado, p. ej. «S/ 124.80». */
  total: string;
  estado: string;
  tono: BadgeTone;
}

/** Estado de la carga del historial dentro del modal de detalle. */
export type HistorialPedidos =
  | { estado: 'inactivo' }
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'listo'; pedidos: PedidoHistorial[] };
