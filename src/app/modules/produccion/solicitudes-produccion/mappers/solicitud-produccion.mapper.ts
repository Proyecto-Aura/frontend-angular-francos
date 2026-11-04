import { BadgeTone } from '../../../../shared/ds/badge/badge';
import {
  DetalleSolicitudProduccionDto,
  IndicadoresSolicitudesProduccionDto,
  SolicitudProduccionDto,
  SolicitudesProduccionPageDto,
} from '../interfaces/solicitud-produccion-dto.interface';
import {
  DetalleSolicitudProduccion,
  EstadoSolicitudProduccion,
  ResumenSolicitudesProduccion,
  SolicitudProduccion,
  SolicitudesProduccionPagina,
} from '../interfaces/solicitud-produccion.interface';

// Etiquetas visuales ("Entregado"/"Rechazado") — el valor real del estado
// es "entregado"/"rechazado" (confirmado por el backend, OFT0-261).
export const ESTADO_SOLICITUD_LABEL: Record<EstadoSolicitudProduccion, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  entregado: 'Entregado',
  rechazado: 'Rechazado',
};

export const ESTADO_SOLICITUD_TONE: Record<EstadoSolicitudProduccion, BadgeTone> = {
  pendiente: 'warning',
  en_proceso: 'info',
  entregado: 'success',
  rechazado: 'danger',
};

export function etiquetaEstadoSolicitud(estado: EstadoSolicitudProduccion): string {
  return ESTADO_SOLICITUD_LABEL[estado];
}

export function tonoEstadoSolicitud(estado: EstadoSolicitudProduccion): BadgeTone {
  return ESTADO_SOLICITUD_TONE[estado];
}

export function toDetalleSolicitudProduccion(
  dto: DetalleSolicitudProduccionDto,
): DetalleSolicitudProduccion {
  return {
    id: dto.id,
    productoTerminadoId: dto.producto_terminado_id,
    sku: dto.sku,
    productoNombre: dto.producto_nombre,
    categoriaNombre: dto.categoria_nombre,
    presentacionCantidad: dto.presentacion_cantidad,
    presentacionUnidadMedida: dto.presentacion_unidad_medida,
    cantidadSolicitada: dto.cantidad_solicitada,
    loteCreado: dto.lote_creado,
  };
}

export function toSolicitudProduccion(dto: SolicitudProduccionDto): SolicitudProduccion {
  return {
    id: dto.id,
    codigo: dto.codigo,
    cantidadProductos: dto.cantidad_productos ?? dto.detalle?.length ?? 0,
    estado: dto.estado,
    fechaCreacion: dto.fecha_creacion,
    fechaLimite: dto.fecha_limite,
    solicitadoPorNombre: dto.solicitado_por_nombre,
    // dto.detalle ?? [] a proposito: el POST no trae "detalle" embebido
    // (bug ya documentado del lado de Inventario) — esta vista tampoco crea
    // solicitudes, pero se blinda igual por si el backend reusa el mismo
    // presenter en algun flujo.
    detalle: (dto.detalle ?? []).map(toDetalleSolicitudProduccion),
  };
}

export function toSolicitudesProduccionPagina(
  pageDto: SolicitudesProduccionPageDto,
): SolicitudesProduccionPagina {
  return {
    solicitudes: pageDto.data.map(toSolicitudProduccion),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

// Renombra pendiente/en_proceso/entregado/rechazado -> pendientes/enProceso/
// completadas/canceladas: "Entregadas"/"Rechazadas" son las etiquetas
// visuales pedidas por el usuario para entregado/rechazado.
export function toResumenSolicitudesProduccion(
  dto: IndicadoresSolicitudesProduccionDto,
): ResumenSolicitudesProduccion {
  return {
    pendientes: dto.pendiente,
    enProceso: dto.en_proceso,
    completadas: dto.entregado,
    canceladas: dto.rechazado,
  };
}

// Siguiente estado al que el rol produccion puede avanzar una solicitud
// (confirmado por el backend): pendiente -> en_proceso -> entregado. Desde
// "entregado" o "rechazado" ya no hay siguiente paso (terminales).
export function siguienteEstadoSolicitud(
  estado: EstadoSolicitudProduccion,
): EstadoSolicitudProduccion | null {
  if (estado === 'pendiente') return 'en_proceso';
  if (estado === 'en_proceso') return 'entregado';
  return null;
}

export function etiquetaAccionSiguienteEstado(estado: EstadoSolicitudProduccion): string | null {
  const siguiente = siguienteEstadoSolicitud(estado);
  if (siguiente === 'en_proceso') return 'Iniciar producción';
  if (siguiente === 'entregado') return 'Marcar entregado';
  return null;
}

// Rechazar (-> rechazado) solo es valido desde "pendiente" (confirmado por
// el backend, mismo criterio que "cancelar" en Inventario) — una vez que
// produccion ya inicio el trabajo (en_proceso), ya no se puede rechazar.
export function puedeRechazarSolicitud(estado: EstadoSolicitudProduccion): boolean {
  return estado === 'pendiente';
}
