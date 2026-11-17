export type EstadoLoteProductoTerminado = 'activo' | 'por_vencer' | 'agotado' | 'vencido';

export interface LoteProductoTerminado {
  id: number;
  productoTerminadoId: number;
  sku: string;
  productoId: number;
  productoNombre: string;
  categoriaId: number;
  categoriaNombre: string;
  presentacionId: number;
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
