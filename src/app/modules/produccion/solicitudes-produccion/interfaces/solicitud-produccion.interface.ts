export type EstadoSolicitudProduccion = 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';

export interface DetalleSolicitudProduccion {
  id: number;
  productoTerminadoId: number;
  sku: string;
  productoNombre: string;
  categoriaNombre: string;
  presentacionCantidad: number;
  presentacionUnidadMedida: 'kg' | 'gr';
  cantidadSolicitada: number;
  // true si ya existe un lote de producto terminado ligado a esta linea —
  // usado por "Registrar entrega" (OFT0-262) y por el buscador de
  // solicitud en "Agregar lote" para filtrar solo lo pendiente.
  loteCreado: boolean;
}

export interface SolicitudProduccion {
  id: number;
  codigo: string;
  cantidadProductos?: number;
  estado: EstadoSolicitudProduccion;
  fechaCreacion: string;
  fechaLimite: string | null;
  solicitadoPorNombre: string;
  detalle: DetalleSolicitudProduccion[];
}

export interface SolicitudesProduccionPagina {
  solicitudes: SolicitudProduccion[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

// "Entregadas"/"Rechazadas" son las etiquetas visuales pedidas por el
// usuario para entregado/rechazado — ver el mapper.
export interface ResumenSolicitudesProduccion {
  pendientes: number;
  enProceso: number;
  completadas: number;
  canceladas: number;
}
