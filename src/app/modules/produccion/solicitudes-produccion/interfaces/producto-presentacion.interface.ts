export interface ProductoPresentacion {
  // null en el caso rarisimo de que producto_terminado no se haya creado —
  // se filtra en el mapper antes de llegar al selector (ver
  // producto-presentacion.mapper.ts).
  productoTerminadoId: number | null;
  sku: string;
  productoNombre: string;
  presentacionCantidad: number;
  presentacionUnidadMedida: 'kg' | 'gr';
}

export interface ProductoPresentacionesPagina {
  productos: ProductoPresentacion[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
