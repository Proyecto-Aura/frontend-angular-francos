import {
  TableroControlDto,
  TableroObjetivoDto,
  TableroPerspectivaDto,
} from '../../negocio/interfaces/tablero-control-dto.interface';
import { ObjetivoNegocioVinculadoDto } from './objetivo-estrategico-ti-dto.interface';

export interface TableroControlTiDto extends TableroControlDto {
  perspectivas: TableroPerspectivaTiDto[];
}

export interface TableroPerspectivaTiDto extends TableroPerspectivaDto {
  objetivos: TableroObjetivoTiDto[];
}

export interface TableroObjetivoTiDto extends TableroObjetivoDto {
  oe_negocio_id: number | null;
  oe_negocio: ObjetivoNegocioVinculadoDto | null;
}
