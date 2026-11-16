// Formas exactas de GET/POST/PATCH /api/v1/insumos, segun confirmo el backend.
export interface InsumoDto {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  unidad_medida: 'kg' | 'litros' | 'unidad';
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  tipo: 'materia_prima' | 'empaque';
  estado: boolean;
  created_at: string;
  updated_at: string;
}

export interface InsumosPageDto {
  data: InsumoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// GET /api/v1/insumos/indicadores — conteos de insumos activos por nivel.
export interface IndicadoresInsumosDto {
  total: number;
  normal: number;
  alto: number;
  bajo: number;
  agotado: number;
}

// Body de POST /api/v1/insumos (sku/id/estado/created_at/updated_at los
// asigna el servidor). stock_actual NO va aca — el backend lo rechaza
// (400 "property stock_actual should not exist"): nace en 0 y lo recalcula
// solo un trigger de Postgres segun los lotes reales.
export interface CrearInsumoRequestDto {
  nombre: string;
  descripcion?: string;
  tipo: 'materia_prima' | 'empaque';
  unidad_medida: 'kg' | 'litros' | 'unidad';
  stock_minimo: number;
  stock_maximo: number;
}

// Body de PATCH /api/v1/insumos/:id — mismos campos que crear, sin sku ni
// estado (esos van por /activate y DELETE aparte). Confirmado por el
// backend: todo opcional, PATCH real.
export type ActualizarInsumoRequestDto = CrearInsumoRequestDto;
