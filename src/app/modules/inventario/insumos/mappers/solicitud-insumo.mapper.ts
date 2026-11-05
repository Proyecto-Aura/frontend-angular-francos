import { BadgeTone } from '../../../../shared/ds/badge/badge';
import {
  DetalleSolicitudInsumoDto,
  IndicadoresSolicitudesInsumoDto,
  SolicitudInsumoDto,
  SolicitudesInsumoPageDto,
} from '../interfaces/solicitud-insumo-dto.interface';
import {
  DetalleSolicitudInsumo,
  DisponibilidadSolicitudInsumo,
  EstadoSolicitudInsumo,
  ResumenSolicitudesInsumo,
  SolicitudInsumo,
  SolicitudesInsumoPagina,
} from '../interfaces/solicitud-insumo.interface';

// Etiquetas visuales ("Entregado"/"Rechazado") — mismo criterio que
// solicitud de produccion.
export const ESTADO_SOLICITUD_INSUMO_LABEL: Record<EstadoSolicitudInsumo, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  entregado: 'Entregado',
  rechazado: 'Rechazado',
};

export const ESTADO_SOLICITUD_INSUMO_TONE: Record<EstadoSolicitudInsumo, BadgeTone> = {
  pendiente: 'warning',
  en_proceso: 'info',
  entregado: 'success',
  rechazado: 'danger',
};

export function etiquetaEstadoSolicitudInsumo(estado: EstadoSolicitudInsumo): string {
  return ESTADO_SOLICITUD_INSUMO_LABEL[estado];
}

export function tonoEstadoSolicitudInsumo(estado: EstadoSolicitudInsumo): BadgeTone {
  return ESTADO_SOLICITUD_INSUMO_TONE[estado];
}

export function toDetalleSolicitudInsumo(dto: DetalleSolicitudInsumoDto): DetalleSolicitudInsumo {
  return {
    id: dto.id,
    insumoId: dto.insumo_id,
    sku: dto.insumo_sku,
    insumoNombre: dto.insumo_nombre,
    unidadMedida: dto.insumo_unidad_medida,
    stockDisponible: dto.stock_disponible ?? null,
    cantidadSolicitada: dto.cantidad_solicitada,
  };
}

export function toSolicitudInsumo(dto: SolicitudInsumoDto): SolicitudInsumo {
  return {
    id: dto.id,
    codigo: dto.codigo_solicitud,
    solicitudProduccionId: dto.solicitud_produccion_id,
    cantidadInsumos: dto.cantidad_insumos ?? dto.detalle?.length ?? 0,
    estado: dto.estado,
    fechaCreacion: dto.fecha_creacion,
    fechaLimite: dto.fecha_limite,
    solicitadoPorNombre: dto.solicitado_por_nombre,
    // dto.detalle ?? [] a proposito — mismo blindaje que solicitud de
    // produccion por si el POST no trae "detalle" embebido igual que el GET.
    detalle: (dto.detalle ?? []).map(toDetalleSolicitudInsumo),
    disponibilidad: dto.disponibilidad,
  };
}

// "Stock completo"/"Stock parcial"/"Sin stock" (OFT0-257, mismo criterio
// visual y de tonos que Pedidos por preparar) — el valor lo calcula el
// backend (ver el comentario en DisponibilidadSolicitudInsumoDto), este
// mapper solo lo traduce a etiqueta/tono.
const DISPONIBILIDAD_SOLICITUD_INSUMO_LABEL: Record<DisponibilidadSolicitudInsumo, string> = {
  completo: 'Stock completo',
  parcial: 'Stock parcial',
  sin_stock: 'Sin stock',
};

const DISPONIBILIDAD_SOLICITUD_INSUMO_TONE: Record<DisponibilidadSolicitudInsumo, BadgeTone> = {
  completo: 'success',
  parcial: 'warning',
  sin_stock: 'danger',
};

export function etiquetaDisponibilidadSolicitudInsumo(
  disponibilidad: DisponibilidadSolicitudInsumo,
): string {
  return DISPONIBILIDAD_SOLICITUD_INSUMO_LABEL[disponibilidad];
}

export function tonoDisponibilidadSolicitudInsumo(
  disponibilidad: DisponibilidadSolicitudInsumo,
): BadgeTone {
  return DISPONIBILIDAD_SOLICITUD_INSUMO_TONE[disponibilidad];
}

export function toSolicitudesInsumoPagina(
  pageDto: SolicitudesInsumoPageDto,
): SolicitudesInsumoPagina {
  return {
    solicitudes: pageDto.data.map(toSolicitudInsumo),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

// Renombra pendiente/en_proceso/entregado/rechazado -> pendientes/enProceso/
// completadas/canceladas — mismo criterio que solicitud de produccion.
export function toResumenSolicitudesInsumo(
  dto: IndicadoresSolicitudesInsumoDto,
): ResumenSolicitudesInsumo {
  return {
    pendientes: dto.pendiente,
    enProceso: dto.en_proceso,
    completadas: dto.entregado,
    canceladas: dto.rechazado,
  };
}

// Siguiente estado al que Inventario puede avanzar una solicitud
// (confirmado por el backend, roles invertidos vs. solicitud de produccion):
// pendiente -> en_proceso -> entregado. Desde "entregado" o "rechazado" ya
// no hay siguiente paso (terminales).
export function siguienteEstadoSolicitudInsumo(
  estado: EstadoSolicitudInsumo,
): EstadoSolicitudInsumo | null {
  if (estado === 'pendiente') return 'en_proceso';
  if (estado === 'en_proceso') return 'entregado';
  return null;
}

export function etiquetaAccionSiguienteEstadoInsumo(estado: EstadoSolicitudInsumo): string | null {
  const siguiente = siguienteEstadoSolicitudInsumo(estado);
  if (siguiente === 'en_proceso') return 'Iniciar entrega';
  if (siguiente === 'entregado') return 'Marcar entregado';
  return null;
}

// Cancelar (-> rechazado) solo es valido desde "pendiente" (pedido explicito
// del usuario) — una vez que Inventario ya inicio la entrega (en_proceso),
// ya no se puede cancelar desde aca.
export function puedeCancelarSolicitudInsumo(estado: EstadoSolicitudInsumo): boolean {
  return estado === 'pendiente';
}
