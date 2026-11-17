// Espejo del contrato real de /api/v1/lotes-producto-terminado (confirmado
// por el backend, OFT0-259): solo lectura — los lotes nacen por
// seed/produccion, no hay POST desde el front (a diferencia de
// lotes-insumo, que si se registran a mano).
export interface LoteProductoTerminadoDto {
  id: number;
  producto_terminado_id: number;
  // Embebidos via JOIN (confirmado por el backend) — no hace falta
  // resolverlos aparte contra /producto-presentaciones.
  sku: string;
  producto_id: number;
  producto_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  presentacion_id: number;
  presentacion_cantidad: number;
  presentacion_unidad_medida: 'kg' | 'gr';
  codigo_lote: string;
  // "fecha_produccion", no "fecha_ingreso" (a diferencia de lotes-insumo) —
  // decision a proposito del backend: un producto terminado se fabrica, no
  // se recibe de un proveedor.
  fecha_produccion: string;
  fecha_vencimiento: string | null;
  cantidad_inicial: number;
  cantidad_actual: number;
  // "por_vencer" lo calcula el backend al leer (no se persiste) — mismo
  // criterio que lotes-insumo.
  estado: 'activo' | 'por_vencer' | 'agotado' | 'vencido';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LotesProductoTerminadoPageDto {
  data: LoteProductoTerminadoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
