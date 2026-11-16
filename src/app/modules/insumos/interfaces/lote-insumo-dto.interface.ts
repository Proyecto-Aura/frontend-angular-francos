// Espejo del contrato real de /api/v1/lotes-insumo (confirmado por el
// backend): solo Create, Read y baja/alta logica — no hay PATCH de edicion,
// un lote no se modifica una vez creado.
export interface LoteInsumoDto {
  id: number;
  insumo_id: number;
  codigo_lote: string;
  fecha_ingreso: string;
  fecha_vencimiento: string | null;
  cantidad_inicial: number;
  cantidad_actual: number;
  // Ciclo de negocio del lote — distinto de "activo" (baja logica
  // administrativa, igual que en insumos). "por_vencer" lo calcula el
  // backend al leer (no se persiste): activo y a 15 dias o menos de
  // fecha_vencimiento (confirmado por el backend).
  estado: 'activo' | 'por_vencer' | 'agotado' | 'vencido';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LotesInsumoPageDto {
  data: LoteInsumoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// Body de POST /api/v1/lotes-insumo — cantidad_actual y estado los asigna el
// servidor, nunca se mandan desde el front (confirmado por el backend).
export interface CrearLoteInsumoRequestDto {
  insumo_id: number;
  codigo_lote: string;
  fecha_ingreso: string;
  fecha_vencimiento?: string;
  cantidad_inicial: number;
  activo?: boolean;
}
