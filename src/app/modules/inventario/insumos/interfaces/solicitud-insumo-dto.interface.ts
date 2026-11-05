// Espejo del contrato de /api/v1/produccion/solicitudes-insumos (OFT0-264,
// confirmado por el backend) — mismo endpoint que ya consume Produccion
// (ver ../../../produccion/solicitudes-insumos/interfaces/solicitud-insumo-dto.interface.ts),
// no se reusa de ahi a proposito: cada modulo de dominio es autocontenido en
// este repo (sin imports cruzados entre modules/). Esta version solo trae lo
// que necesita la vista de Inventario (listar/ver/cambiar estado) — sin
// alta/edicion, que son exclusivas de Produccion. Roles invertidos vs.
// solicitud de produccion: admin/produccion crean (y produccion rechaza),
// Inventario es quien avanza/entrega. Al pasar a "entregado" el backend
// registra una salida real de cada insumo (descuenta stock FEFO, todo o
// nada con 409 si falta stock).
export type EstadoSolicitudInsumoDto = 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';

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
  // por :id.
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

/** GET /produccion/solicitudes-insumos/indicadores. */
export interface IndicadoresSolicitudesInsumoDto {
  pendiente: number;
  en_proceso: number;
  entregado: number;
  rechazado: number;
  total: number;
}

// PATCH /produccion/solicitudes-insumos/:id/estado — la transicion valida
// depende del rol de quien llama (confirmado por el backend): Inventario
// mueve pendiente -> en_proceso -> entregado. Fuera de esas transiciones da
// 409 (y tambien 409 si al pasar a "entregado" falta stock de algun insumo).
//
// "items" (confirmado por el backend, pedido explicito del usuario: mismo
// UX que "Marcar pendiente de entrega" en Pedidos) es OPCIONAL y solo
// aplica para estado:"entregado" — si no se manda, el backend despacha
// cantidad_solicitada de cada linea del detalle (comportamiento anterior).
// Si se manda, tiene que cubrir EXACTAMENTE las lineas del detalle (ni de
// mas ni de menos, sin repetidos) o tira 400. Para "en_proceso"/"rechazado"
// se ignora, no hace falta mandarlo.
export interface ItemEntregaSolicitudInsumoDto {
  insumo_id: number;
  cantidad_entregada: number;
}

export interface CambiarEstadoSolicitudInsumoRequestDto {
  estado: EstadoSolicitudInsumoDto;
  items?: ItemEntregaSolicitudInsumoDto[];
}
