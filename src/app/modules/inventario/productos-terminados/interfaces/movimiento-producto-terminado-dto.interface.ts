// Espejo del contrato real de GET /api/v1/movimientos-producto-terminado y
// de la respuesta de POST entrada|salida|ajuste (confirmado por el backend,
// OFT0-259, verificado contra los presenters reales) — mismo patron que
// movimientos-insumo. A diferencia de movimiento-insumo (que trae
// "unidad_medida" suelto), aca no hay unidad de medida propia del stock:
// viene "presentacion_cantidad" + "presentacion_unidad_medida" (producto
// terminado se cuenta en unidades, la presentacion solo describe el tamanio
// de cada una).
export interface MovimientoProductoTerminadoDto {
  id: number;
  codigo: string;
  lote_producto_terminado_id: number;
  codigo_lote: string;
  producto_terminado_id: number;
  sku: string;
  producto_id: number;
  producto_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  presentacion_id: number;
  presentacion_cantidad: number;
  presentacion_unidad_medida: 'kg' | 'gr';
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

export interface MovimientosProductoTerminadoPageDto {
  data: MovimientoProductoTerminadoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// --- Alta de movimientos (POST /movimientos-producto-terminado/entrada|salida|ajuste) ---
// Los 3 aceptan un objeto unico o un array de filas — guardadas todo o nada
// en una sola transaccion (confirmado por el backend, mismo criterio que
// movimientos-insumo). El front siempre manda array.
//
// Importante: el shape del body cambia segun el tipo. Entrada/ajuste piden
// lote_producto_terminado_id (un lote ya existente puntual); salida pide
// producto_terminado_id en vez de lote (el backend reparte FEFO automatico
// entre los lotes de ese producto, no se elige lote a mano).
export interface CrearMovimientoProductoTerminadoLoteItemDto {
  lote_producto_terminado_id: number;
  cantidad: number;
  razon: string;
}

export interface CrearMovimientoProductoTerminadoSalidaItemDto {
  producto_terminado_id: number;
  cantidad: number;
  razon: string;
}
