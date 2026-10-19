// Formas exactas de GET y POST /api/v1/planes-estrategicos.
export interface EstadoPlanDto {
  codigo: 'BORRADOR' | 'ACTIVO' | 'CERRADO';
  nombre: string;
}

export interface PlanEstrategicoDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  anio_inicio: number;
  anio_fin: number;
  estado_plan_id: number;
  estado: boolean;
  created_at: string;
  updated_at: string;
  estado_plan: EstadoPlanDto;
}

export interface PlanesEstrategicosPageDto {
  data: PlanEstrategicoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface CrearPlanEstrategicoRequestDto {
  nombre: string;
  descripcion?: string;
  anio_inicio: number;
  anio_fin: number;
}

export interface ActualizarPlanEstrategicoRequestDto {
  nombre?: string;
  descripcion?: string;
  anio_inicio?: number;
  anio_fin?: number;
}

export interface ApiErrorDto {
  statusCode: number;
  message: string | string[];
}
