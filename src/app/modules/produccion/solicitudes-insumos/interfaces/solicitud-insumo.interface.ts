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

export interface ResumenSolicitudesInsumo {
  pendientes: number;
  enProceso: number;
  completadas: number;
  canceladas: number;
}

// Campos como string porque vienen de <app-ds-input>/<app-ds-combobox> —
// se parsean recien al armar el request.
export interface FilaDetalleSolicitudInsumoForm {
  id: number;
  insumoId: string;
  cantidadSolicitada: string;
}

export function filaDetalleSolicitudInsumoVacia(id: number): FilaDetalleSolicitudInsumoForm {
  return { id, insumoId: '', cantidadSolicitada: '0' };
}

export interface SolicitudInsumoForm {
  fechaLimite: string;
  filas: FilaDetalleSolicitudInsumoForm[];
}

// Fila del modal de EDICION — a diferencia de FilaDetalleSolicitudInsumoForm,
// rastrea el detalleId real (null = fila nueva, todavia no existe en el
// backend) y la cantidad original (null en una fila nueva) para que
// calcularCambiosSolicitudInsumo() pueda armar el diff contra el snapshot
// con el que se abrio el modal.
export interface FilaEditarSolicitudInsumo {
  id: number;
  detalleId: number | null;
  insumoId: string;
  cantidadSolicitada: string;
  cantidadOriginal: string | null;
}
