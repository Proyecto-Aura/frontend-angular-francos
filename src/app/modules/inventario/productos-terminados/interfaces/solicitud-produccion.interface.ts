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
// usuario para entregado/rechazado — ver el mapper y ESTADO_LABEL en
// solicitudes-produccion.ts.
export interface ResumenSolicitudesProduccion {
  pendientes: number;
  enProceso: number;
  completadas: number;
  canceladas: number;
}

// Campos como string porque vienen de <app-ds-input>/<app-ds-combobox> —
// se parsean recien al armar el request.
export interface FilaDetalleSolicitudProduccionForm {
  id: number;
  productoTerminadoId: string;
  cantidadSolicitada: string;
}

export function filaDetalleSolicitudProduccionVacia(
  id: number,
): FilaDetalleSolicitudProduccionForm {
  return { id, productoTerminadoId: '', cantidadSolicitada: '0' };
}

export interface SolicitudProduccionForm {
  fechaLimite: string;
  filas: FilaDetalleSolicitudProduccionForm[];
}

// Fila del modal de EDICION — a diferencia de FilaDetalleSolicitudProduccionForm,
// rastrea el detalleId real (null = fila nueva, todavia no existe en el
// backend) y la cantidad original (null en una fila nueva) para que
// calcularCambiosSolicitudProduccion() pueda armar el diff contra el
// snapshot con el que se abrio el modal.
export interface FilaEditarSolicitudProduccion {
  id: number;
  detalleId: number | null;
  productoTerminadoId: string;
  cantidadSolicitada: string;
  cantidadOriginal: string | null;
}
