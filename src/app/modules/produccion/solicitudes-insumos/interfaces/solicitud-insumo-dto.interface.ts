// Espejo del contrato de /api/v1/produccion/solicitudes-insumos (OFT0-264,
// confirmado por el backend) — mismo patron que solicitud de produccion,
// pero con roles invertidos: admin/produccion crean (y produccion es quien
// puede rechazar), inventario es quien avanza/entrega. Al pasar a
// "entregado" el backend registra solo una salida real de cada insumo
// (descuenta stock FEFO, todo o nada con 409 si falta stock) — a
// diferencia de solicitud de produccion, que no mueve stock.
export type EstadoSolicitudInsumoDto = 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';

// El backend confirmo el campo "codigo_solicitud" en el body de alta — el
// resto de la cabecera (fechas/solicitante/cantidad) se infiere por
// analogia con solicitud de produccion (mismo patron, mismo endpoint de
// indicadores con exactamente el mismo shape), todavia no confirmado
// campo por campo contra una respuesta real; ajustar aca si el backend
// corrige algun nombre.
export interface DetalleSolicitudInsumoDto {
  id: number;
  insumo_id: number;
  insumo_sku: string;
  insumo_nombre: string;
  insumo_unidad_medida: 'kg' | 'litros' | 'unidad';
  cantidad_solicitada: number;
  created_at: string;
}

export interface SolicitudInsumoDto {
  id: number;
  codigo_solicitud: string;
  // Solo si esta solicitud de insumos nace de una solicitud de produccion
  // puntual (confirmado por el backend) — null en una solicitud "suelta".
  solicitud_produccion_id: number | null;
  cantidad_insumos?: number;
  estado: EstadoSolicitudInsumoDto;
  fecha_creacion: string;
  fecha_limite: string | null;
  solicitado_por: string;
  solicitado_por_nombre: string;
  created_at: string;
  updated_at: string;
  // Opcional a proposito, mismo blindaje que solicitud de produccion: el
  // presenter del POST puede no traer "detalle" embebido igual que el GET
  // por :id (bug real ya visto en ese endpoint analogo).
  detalle?: DetalleSolicitudInsumoDto[];
}

export interface SolicitudesInsumoPageDto {
  data: SolicitudInsumoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// GET /produccion/solicitudes-insumos/indicadores (confirmado por el
// backend, mismo shape que el analogo de solicitud de produccion).
export interface IndicadoresSolicitudesInsumoDto {
  pendiente: number;
  en_proceso: number;
  entregado: number;
  rechazado: number;
  total: number;
}

// --- Alta (POST /produccion/solicitudes-insumos) ---
export interface CrearDetalleSolicitudInsumoItemDto {
  insumo_id: number;
  cantidad_solicitada: number;
}

export interface CrearSolicitudInsumoRequestDto {
  codigo_solicitud: string;
  solicitud_produccion_id?: number;
  fecha_limite?: string;
  detalle: CrearDetalleSolicitudInsumoItemDto[];
}

// --- Cambio de estado (PATCH .../:id/estado) ---
export interface CambiarEstadoSolicitudInsumoRequestDto {
  estado: EstadoSolicitudInsumoDto;
}

// --- Edicion (mientras "pendiente", mismo patron que solicitud de
// produccion: llamadas separadas por tipo de cambio, no un endpoint
// combinado) ---
export interface ActualizarFechaLimiteSolicitudInsumoRequestDto {
  fecha_limite: string;
}

export interface ActualizarCantidadDetalleSolicitudInsumoRequestDto {
  cantidad_solicitada: number;
}
