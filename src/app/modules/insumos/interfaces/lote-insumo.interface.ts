export type EstadoLote = 'activo' | 'por_vencer' | 'agotado' | 'vencido';

export interface LoteInsumo {
  id: number;
  insumoId: number;
  codigoLote: string;
  fechaIngreso: string;
  fechaVencimiento: string | null;
  cantidadInicial: number;
  cantidadActual: number;
  estado: EstadoLote;
  activo: boolean;
}

export interface LotesInsumoPagina {
  lotes: LoteInsumo[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

// Campos como string porque vienen de <app-ds-input> (mismo patron que
// InsumoForm) — se parsean recien al armar el request. insumoId tambien es
// string porque sale de <app-ds-select>, que solo maneja strings.
export interface LoteInsumoForm {
  insumoId: string;
  codigoLote: string;
  fechaIngreso: string;
  fechaVencimiento: string;
  cantidadInicial: string;
}
