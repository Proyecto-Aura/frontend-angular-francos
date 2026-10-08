export type EstadoPlanCodigo = 'BORRADOR' | 'ACTIVO' | 'CERRADO';

export interface PlanEstrategico {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  anioInicio: number;
  anioFin: number;
  estadoCodigo: EstadoPlanCodigo;
  estadoNombre: string;
  activo: boolean;
}

export interface PlanesEstrategicosPagina {
  planes: PlanEstrategico[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface PlanEstrategicoForm {
  nombre: string;
  descripcion: string;
  anioInicio: string;
  anioFin: string;
}
