import { BadgeTone } from '../../../../shared/ds/badge/badge';
import {
  CrearDetalleSolicitudProduccionItemDto,
  CrearSolicitudProduccionRequestDto,
  DetalleSolicitudProduccionDto,
  IndicadoresSolicitudesProduccionDto,
  SolicitudProduccionDto,
  SolicitudesProduccionPageDto,
} from '../interfaces/solicitud-produccion-dto.interface';
import {
  DetalleSolicitudProduccion,
  EstadoSolicitudProduccion,
  FilaEditarSolicitudProduccion,
  ResumenSolicitudesProduccion,
  SolicitudProduccion,
  SolicitudProduccionForm,
  SolicitudesProduccionPagina,
} from '../interfaces/solicitud-produccion.interface';

// Etiquetas visuales ("Entregado"/"Rechazado") pedidas por el usuario por
// mockup — el valor real del estado es "entregado"/"rechazado" (confirmado
// por el backend, OFT0-261). Centralizado aca (en vez de duplicado en cada
// componente que muestra el estado) porque tanto la lista como el modal de
// detalle lo necesitan.
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
    // dto.detalle ?? [] a proposito: bug reportado por el backend donde el
    // POST se creaba bien (201 confirmado en la base) pero el front
    // mostraba error igual — si la respuesta del POST no trae "detalle"
    // embebido igual que el GET, dto.detalle.map(...) tira un TypeError que
    // cae al catch generico sin que la persona se entere de que la
    // solicitud SI se creo. Investigando la causa real con el backend,
    // esto blinda el mapper mientras tanto.
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

export function toCrearSolicitudProduccionRequest(
  codigo: string,
  form: SolicitudProduccionForm,
): CrearSolicitudProduccionRequestDto {
  return {
    codigo,
    fecha_limite: form.fechaLimite,
    detalle: form.filas.map((fila) => ({
      producto_terminado_id: Number(fila.productoTerminadoId),
      cantidad_solicitada: Number(fila.cantidadSolicitada),
    })),
  };
}

// Renombra pendiente/en_proceso/entregado/rechazado -> pendientes/enProceso/
// completadas/canceladas: "Entregadas"/"Rechazadas" son las etiquetas
// visuales pedidas por el usuario para entregado/rechazado (ver
// ESTADO_LABEL en solicitudes-produccion.ts) — mismo criterio que
// toResumenProductosTerminados() renombrando agotado -> agotados.
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

// Codigo de solicitud FR-SPR-[000]-[YYMMDD] — mismo formato que
// codigo_lote (FR-LT-[000]-[YYMMDD]-INS{id}), sin el sufijo de entidad
// porque una solicitud no esta scoped a un solo producto.
export function construirCodigoSolicitud(secuencial: number, fecha = new Date()): string {
  const secuencialTexto = String(secuencial).padStart(3, '0');
  const anio = String(fecha.getFullYear()).slice(-2);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `FR-SPR-${secuencialTexto}-${anio}${mes}${dia}`;
}

const PATRON_SECUENCIAL_CODIGO_SOLICITUD = /^FR-SPR-(\d+)-\d{6}$/;

export interface SolicitudExistente {
  codigo: string;
}

// El proximo secuencial sale del MAXIMO ya usado entre los codigos que
// trae la respuesta. El filtro "solo de HOY" (se reinicia por dia) ya NO
// se hace aca comparando fecha_creacion contra la fecha local — el caller
// (SolicitudProduccionService.siguienteSecuencial) le pide al backend
// directamente las solicitudes de hoy via fecha_desde/fecha_hasta, que el
// backend resuelve en zona Lima. Bug real encontrado por el backend:
// fecha_creacion se guardaba con la fecha UTC de new Date() en el server,
// no la de Lima — entre las 19:00 y medianoche hora Lima el dia UTC ya es
// "mañana", asi que comparar fecha_creacion.slice(0,10) contra la fecha
// local del navegador podia no encontrar nunca la solicitud recien creada
// (el secuencial se quedaba repitiendo el mismo numero, mismo bug
// encontrado en solicitud de insumos). El backend ya corrigio como se
// guarda fecha_creacion, pero ademas conviene no volver a comparar
// fechas-string en el cliente.
export function siguienteSecuencialSolicitud(solicitudes: SolicitudExistente[]): number {
  const maximo = solicitudes.reduce((max, s) => {
    const match = s.codigo.match(PATRON_SECUENCIAL_CODIGO_SOLICITUD);
    const numero = match ? Number(match[1]) : 0;
    return Math.max(max, numero);
  }, 0);
  return maximo + 1;
}

export interface CambiosSolicitudProduccion {
  // null = no cambio (no se manda el PATCH de fecha_limite).
  fechaLimite: string | null;
  altas: CrearDetalleSolicitudProduccionItemDto[];
  actualizaciones: { detalleId: number; cantidadSolicitada: number }[];
  bajas: number[];
}

// Arma el plan de llamadas para "Guardar cambios" en el modal de edicion —
// no hay un solo endpoint combinado (confirmado por el backend): se
// comparan las filas actuales contra el snapshot con el que se abrio el
// modal (fechaLimiteOriginal + los detalleId que ya existian) para decidir
// que PATCH/POST/DELETE hace falta. Una fila con detalleId null es una
// alta (todavia no existe en el backend); un detalleId original que ya no
// esta en las filas actuales es una baja.
export function calcularCambiosSolicitudProduccion(
  fechaLimiteOriginal: string,
  fechaLimiteActual: string,
  detalleIdsOriginales: number[],
  filas: FilaEditarSolicitudProduccion[],
): CambiosSolicitudProduccion {
  const altas = filas
    .filter((fila) => fila.detalleId === null)
    .map((fila) => ({
      producto_terminado_id: Number(fila.productoTerminadoId),
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
