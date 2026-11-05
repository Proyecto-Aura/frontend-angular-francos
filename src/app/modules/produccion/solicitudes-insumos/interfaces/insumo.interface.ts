export interface Insumo {
  id: number;
  sku: string;
  nombre: string;
  unidadMedida: 'kg' | 'litros' | 'unidad';
  stockActual: number;
  stockMinimo: number;
}

export interface InsumosPagina {
  insumos: Insumo[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
