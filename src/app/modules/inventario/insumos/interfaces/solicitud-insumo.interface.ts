export type EstadoSolicitudInsumo = 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';

export interface DetalleSolicitudInsumo {
  id: number;
  insumoId: number;
  sku: string;
  insumoNombre: string;
  unidadMedida: 'kg' | 'litros' | 'unidad';
  cantidadSolicitada: number;
}

export interface SolicitudInsumo {
  id: number;
  codigo: string;
  solicitudProduccionId: number | null;
  cantidadInsumos?: number;
  estado: EstadoSolicitudInsumo;
  fechaCreacion: string;
  fechaLimite: string | null;
  solicitadoPorNombre: string;
  detalle: DetalleSolicitudInsumo[];
}

export interface SolicitudesInsumoPagina {
  solicitudes: SolicitudInsumo[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

// "Entregadas"/"Rechazadas" son las etiquetas visuales pedidas por el
// usuario para entregado/rechazado — mismo criterio que solicitud de
// produccion.
export interface ResumenSolicitudesInsumo {
  pendientes: number;
  enProceso: number;
  completadas: number;
  canceladas: number;
}

// Cantidad entregada por linea al confirmar "Registrar entrega" — opcional
// en el PATCH .../estado (confirmado por el backend): si se manda, tiene
// que cubrir exactamente las lineas del detalle (mismo criterio que
// "Marcar pendiente de entrega" en Pedidos por preparar).
export interface ItemEntregaSolicitudInsumo {
  insumoId: number;
  cantidadEntregada: number;
}
