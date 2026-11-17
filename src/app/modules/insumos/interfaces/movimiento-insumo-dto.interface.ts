// Espejo del contrato real de GET /api/v1/movimientos-insumo (confirmado por
// el backend). "razon" (no "motivo") y "fecha" (timestamptz, no existe un
// campo separado "fecha_hora") son los nombres reales, no los que se
// muestran en la UI.
export interface MovimientoInsumoDto {
  id: number;
  codigo: string;
  lote_insumo_id: number;
  // Embebidos via JOIN (confirmado por el backend) — no hace falta
  // resolverlos aparte contra /lotes-insumo ni /insumos. Van como campos
  // planos, no como un objeto "insumo: {...}" anidado (asi lo definio el
  // backend).
  codigo_lote: string;
  insumo_id: number;
  insumo_nombre: string;
  insumo_sku: string;
  insumo_unidad_medida: 'kg' | 'litros' | 'unidad';
  tipo: 'entrada' | 'salida' | 'ajuste';
  // Siempre positiva en entrada/salida (el signo lo da "tipo"); en "ajuste"
  // viene con signo propio (+/-).
  cantidad: number;
  stock_anterior: number;
  stock_resultante: number;
  razon: string;
  fecha: string;
  created_at: string;
}

export interface MovimientosInsumoPageDto {
  data: MovimientoInsumoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// --- Alta de movimientos (POST /movimientos-insumo/entrada|salida) ---
// Ambos endpoints aceptan un objeto unico (mismo shape, sin array) o un
// array de filas — mandando un array, el backend las guarda todas en una
// sola transaccion (todo o nada); si una fila falla, no queda nada
// registrado y el error identifica la fila (confirmado por el backend). El
// front siempre manda array, aunque sea de una sola fila, para no duplicar
// casos. La respuesta es un array de MovimientoInsumoDto (mismo shape que
// el listado), uno por fila.
export interface CrearMovimientoEntradaItemDto {
  lote_insumo_id: number;
  cantidad: number;
  razon: string;
}

export interface CrearMovimientoSalidaItemDto {
  insumo_id: number;
  cantidad: number;
  razon: string;
}
