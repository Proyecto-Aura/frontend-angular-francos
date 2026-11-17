import {
  TableroControl,
  TableroKpiFila,
  TableroPerspectiva,
} from '../../negocio/interfaces/tablero-control.interface';
import { ObjetivoNegocioVinculado } from './objetivo-estrategico-ti.interface';

export interface TableroControlTi extends TableroControl {
  perspectivas: TableroPerspectivaTi[];
}

export interface TableroPerspectivaTi extends TableroPerspectiva {
  kpis: TableroKpiFilaTi[];
}

export interface TableroKpiFilaTi extends TableroKpiFila {
  oeNegocio: ObjetivoNegocioVinculado | null;
}
