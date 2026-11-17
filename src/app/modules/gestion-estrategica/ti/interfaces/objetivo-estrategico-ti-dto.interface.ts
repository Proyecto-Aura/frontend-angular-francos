import {
  ObjetivoEstrategicoDto,
  PerspectivaBscDto,
} from '../../negocio/interfaces/objetivo-estrategico-dto.interface';
import { PlanEstrategicoDto } from '../../plan-estrategico/interfaces/plan-estrategico-dto.interface';

export interface ObjetivoNegocioVinculadoDto {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ObjetivoEstrategicoTiDto extends ObjetivoEstrategicoDto {
  oe_negocio_id: number | null;
  oe_negocio: ObjetivoNegocioVinculadoDto | null;
}

export interface ResumenObjetivosTiPlanDto {
  plan: PlanEstrategicoDto;
  total_objetivos: number;
  perspectivas: {
    perspectiva: PerspectivaBscDto;
    objetivos: ObjetivoEstrategicoTiDto[];
  }[];
}

export interface CrearObjetivoEstrategicoTiRequestDto {
  plan_estrategico_id: number;
  perspectiva_bsc_id: number;
  nombre: string;
  descripcion?: string;
  responsable: string;
  relaciones_destino_ids?: number[];
  oe_negocio_id: number;
}

export interface ActualizarObjetivoEstrategicoTiRequestDto {
  perspectiva_bsc_id?: number;
  nombre?: string;
  descripcion?: string;
  responsable?: string;
  relaciones_destino_ids?: number[];
  oe_negocio_id?: number;
}
