export type EstadoLoteProductoTerminado = 'activo' | 'por_vencer' | 'agotado' | 'vencido';

export interface LoteProductoTerminado {
  id: number;
  productoTerminadoId: number;
  sku: string;
  productoNombre: string;
  presentacionCantidad: number;
  presentacionUnidadMedida: 'kg' | 'gr';
  codigoLote: string;
  fechaProduccion: string;
  fechaVencimiento: string | null;
  cantidadInicial: number;
  cantidadActual: number;
  estado: EstadoLoteProductoTerminado;
  activo: boolean;
}

export interface LotesProductoTerminadoPagina {
  lotes: LoteProductoTerminado[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

// Campos como string porque vienen de <app-ds-input>/<app-ds-combobox> — se
// parsean recien al armar el request.
export interface LoteProductoTerminadoForm {
  productoTerminadoId: string;
  codigoLote: string;
  fechaProduccion: string;
  fechaVencimiento: string;
  cantidadInicial: string;
}
