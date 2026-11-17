import {
  ObjetivoEstrategico,
  ObjetivoEstrategicoForm,
} from '../../negocio/interfaces/objetivo-estrategico.interface';

export interface ObjetivoNegocioVinculado {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ObjetivoEstrategicoTi extends ObjetivoEstrategico {
  oeNegocioId: number | null;
  oeNegocio: ObjetivoNegocioVinculado | null;
}

export interface ObjetivoEstrategicoTiForm extends ObjetivoEstrategicoForm {
  oeNegocioId: number | null;
}
