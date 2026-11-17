// Espejo del contrato real de /api/v1/solicitudes-produccion (OFT0-261,
// confirmado por el backend) — mismo endpoint que ya consume Inventario
// (ver ../../../inventario/productos-terminados/interfaces/solicitud-produccion-dto.interface.ts),
// no se reusa de ahi a proposito: cada modulo de dominio es autocontenido
// en este repo (sin imports cruzados entre modules/). Esta version solo
// trae los campos que necesita la vista de Produccion (sin alta/edicion,
// que siguen siendo exclusivas de Inventario).
export type EstadoSolicitudProduccionDto = 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';

// Detalle embebido via JOIN (confirmado por el backend) — no hace falta
// resolver producto/categoria/presentacion aparte contra
// /producto-presentaciones.
export interface DetalleSolicitudProduccionDto {
  id: number;
  solicitud_produccion_id: number;
  producto_terminado_id: number;
  sku: string;
  producto_id: number;
  producto_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  presentacion_id: number;
  presentacion_cantidad: number;
  presentacion_unidad_medida: 'kg' | 'gr';
  cantidad_solicitada: number;
  created_at: string;
  // Agregado por el backend para OFT0-262 ("Registrar entrega"): true si ya
  // existe un lote de producto terminado ligado a esta linea (via
  // lotes-producto-terminado.solicitud_produccion_id), false si todavia
  // falta registrarlo. El backend tambien bloquea con 409 "Faltan lotes por
  // registrar..." si se intenta marcar "entregado" con alguno en false.
  lote_creado: boolean;
}

export interface SolicitudProduccionDto {
  id: number;
  codigo: string;
  cantidad_productos?: number;
  estado: EstadoSolicitudProduccionDto;
  fecha_creacion: string;
  fecha_limite: string | null;
  solicitado_por: string;
  solicitado_por_nombre: string;
  created_at: string;
  updated_at: string;
  detalle?: DetalleSolicitudProduccionDto[];
}

export interface SolicitudesProduccionPageDto {
  data: SolicitudProduccionDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/** GET /solicitudes-produccion/indicadores. */
export interface IndicadoresSolicitudesProduccionDto {
  pendiente: number;
  en_proceso: number;
  entregado: number;
  rechazado: number;
  total: number;
}

// PATCH /solicitudes-produccion/:id/estado — la transicion valida depende
// del rol de quien llama (confirmado por el backend): produccion mueve
// pendiente -> en_proceso -> entregado, o pendiente -> rechazado. Fuera de
// esas transiciones da 409.
export interface CambiarEstadoSolicitudProduccionRequestDto {
  estado: EstadoSolicitudProduccionDto;
}
