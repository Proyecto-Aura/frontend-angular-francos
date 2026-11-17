import { BadgeTone } from '../../../../shared/ds/badge/badge';
import {
  CrearDetalleSolicitudInsumoItemDto,
  CrearSolicitudInsumoRequestDto,
  DetalleSolicitudInsumoDto,
  IndicadoresSolicitudesInsumoDto,
  SolicitudInsumoDto,
  SolicitudesInsumoPageDto,
} from '../interfaces/solicitud-insumo-dto.interface';
import {
  DetalleSolicitudInsumo,
  EstadoSolicitudInsumo,
  FilaEditarSolicitudInsumo,
  ResumenSolicitudesInsumo,
  SolicitudInsumo,
  SolicitudInsumoForm,
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
  };
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

export function toCrearSolicitudInsumoRequest(
  codigo: string,
  form: SolicitudInsumoForm,
  solicitudProduccionId?: number,
): CrearSolicitudInsumoRequestDto {
  return {
    codigo_solicitud: codigo,
    ...(solicitudProduccionId ? { solicitud_produccion_id: solicitudProduccionId } : {}),
    fecha_limite: form.fechaLimite,
    detalle: form.filas.map((fila) => ({
      insumo_id: Number(fila.insumoId),
      cantidad_solicitada: Number(fila.cantidadSolicitada),
    })),
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

// Codigo FR-SIN-[000]-[YYMMDD] — mismo formato que FR-SPR de solicitud de
// produccion (confirmado por el backend, ver el ejemplo "FR-SIN-001-261104"
// en el body de alta), sin sufijo de entidad porque una solicitud no esta
// scoped a un solo insumo.
export function construirCodigoSolicitudInsumo(secuencial: number, fecha = new Date()): string {
  const secuencialTexto = String(secuencial).padStart(3, '0');
  const anio = String(fecha.getFullYear()).slice(-2);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `FR-SIN-${secuencialTexto}-${anio}${mes}${dia}`;
}

const PATRON_SECUENCIAL_CODIGO_SOLICITUD_INSUMO = /^FR-SIN-(\d+)-\d{6}$/;

export interface SolicitudInsumoExistente {
  codigo: string;
}

// El proximo secuencial sale del MAXIMO ya usado entre los codigos que
// trae la respuesta. El filtro "solo de HOY" (se reinicia por dia) ya NO
// se hace aca comparando fecha_creacion contra la fecha local — el caller
// (SolicitudInsumoService.siguienteSecuencial) le pide al backend
// directamente las solicitudes de hoy via fecha_desde/fecha_hasta, que el
// backend resuelve en zona Lima. Bug real encontrado por el backend:
// fecha_creacion se guardaba con la fecha UTC de new Date() en el server,
// no la de Lima — entre las 19:00 y medianoche hora Lima el dia UTC ya es
// "mañana", asi que comparar fecha_creacion.slice(0,10) contra la fecha
// local del navegador podia no encontrar nunca la solicitud recien creada
// (el secuencial se quedaba repitiendo el mismo numero). El backend ya
// corrigio como se guarda fecha_creacion, pero ademas conviene no volver a
// comparar fechas-string en el cliente — mismo criterio ahora en
// solicitud de produccion (Inventario), que tenia el mismo bug.
export function siguienteSecuencialSolicitudInsumo(
  solicitudes: SolicitudInsumoExistente[],
): number {
  const maximo = solicitudes.reduce((max, s) => {
    const match = s.codigo.match(PATRON_SECUENCIAL_CODIGO_SOLICITUD_INSUMO);
    const numero = match ? Number(match[1]) : 0;
    return Math.max(max, numero);
  }, 0);
  return maximo + 1;
}

export interface CambiosSolicitudInsumo {
  // null = no cambio (no se manda el PATCH de fecha_limite).
  fechaLimite: string | null;
  altas: CrearDetalleSolicitudInsumoItemDto[];
  actualizaciones: { detalleId: number; cantidadSolicitada: number }[];
  bajas: number[];
}

// Arma el plan de llamadas para "Guardar cambios" en el modal de edicion —
// mismo criterio que calcularCambiosSolicitudProduccion: se comparan las
// filas actuales contra el snapshot con el que se abrio el modal para
// decidir que PATCH/POST/DELETE hace falta.
export function calcularCambiosSolicitudInsumo(
  fechaLimiteOriginal: string,
  fechaLimiteActual: string,
  detalleIdsOriginales: number[],
  filas: FilaEditarSolicitudInsumo[],
): CambiosSolicitudInsumo {
  const altas = filas
    .filter((fila) => fila.detalleId === null)
    .map((fila) => ({
      insumo_id: Number(fila.insumoId),
      cantidad_solicitada: Number(fila.cantidadSolicitada),
    }));

  const actualizaciones = filas
    .filter((fila) => fila.detalleId !== null && fila.cantidadSolicitada !== fila.cantidadOriginal)
    .map((fila) => ({
      detalleId: fila.detalleId as number,
      cantidadSolicitada: Number(fila.cantidadSolicitada),
    }));

  const idsActuales = new Set(
    filas.map((fila) => fila.detalleId).filter((id): id is number => id !== null),
  );
  const bajas = detalleIdsOriginales.filter((id) => !idsActuales.has(id));

  return {
    fechaLimite: fechaLimiteActual !== fechaLimiteOriginal ? fechaLimiteActual : null,
    altas,
    actualizaciones,
    bajas,
  };
}

// Siguiente estado al que inventario puede avanzar una solicitud
// (confirmado por el backend): pendiente -> en_proceso -> entregado.
export function siguienteEstadoSolicitudInsumo(
  estado: EstadoSolicitudInsumo,
): EstadoSolicitudInsumo | null {
  if (estado === 'pendiente') return 'en_proceso';
  if (estado === 'en_proceso') return 'entregado';
  return null;
}

// Rechazar (-> rechazado) solo es valido desde "pendiente" — lo hace
// produccion (el solicitante), mismo criterio que "cancelar" en solicitud
// de produccion.
export function puedeRechazarSolicitudInsumo(estado: EstadoSolicitudInsumo): boolean {
  return estado === 'pendiente';
}
