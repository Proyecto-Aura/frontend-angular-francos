import { PlanEstrategicoDto } from '../../plan-estrategico/interfaces/plan-estrategico-dto.interface';

// Formas exactas de GET /perspectivas-bsc y
// GET /planes-estrategicos/:id/objetivos-estrategicos.
export interface PerspectivaBscDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface EstadoObjetivoDto {
  codigo: 'PENDIENTE' | 'EN_PROCESO' | 'CUMPLIDO' | 'CANCELADO';
  nombre: string;
}

export interface ObjetivoEstrategicoDto {
  id: number;
  codigo: string;
  plan_estrategico_id: number;
  perspectiva_bsc_id: number;
  responsable: string;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
  created_at: string;
  updated_at: string;
  perspectiva_bsc: PerspectivaBscDto;
  estado_objetivo: EstadoObjetivoDto;
  relaciones_destino_ids: number[];
}

export interface ResumenObjetivosPlanDto {
  plan: PlanEstrategicoDto;
  total_objetivos: number;
  perspectivas: {
    perspectiva: PerspectivaBscDto;
    objetivos: ObjetivoEstrategicoDto[];
  }[];
}

export interface CrearObjetivoEstrategicoRequestDto {
  plan_estrategico_id: number;
  perspectiva_bsc_id: number;
  nombre: string;
  descripcion?: string;
  responsable: string;
  relaciones_destino_ids?: number[];
}

export interface ActualizarObjetivoEstrategicoRequestDto {
  perspectiva_bsc_id?: number;
  nombre?: string;
  descripcion?: string;
  responsable?: string;
  relaciones_destino_ids?: number[];
}

export interface ApiErrorDto {
  statusCode: number;
  message: string | string[];
}
