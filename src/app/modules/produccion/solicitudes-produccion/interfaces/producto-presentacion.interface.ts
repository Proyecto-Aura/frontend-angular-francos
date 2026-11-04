export interface ProductoPresentacion {
  // null en el caso rarisimo de que producto_terminado no se haya creado —
  // se filtra en el mapper antes de llegar al selector (ver
  // producto-presentacion.mapper.ts).
  productoTerminadoId: number | null;
  sku: string;
  productoNombre: string;
  presentacionCantidad: number;
  presentacionUnidadMedida: 'kg' | 'gr';
  // null en el mismo caso rarisimo que productoTerminadoId — usado por el
  // modal "Registrar entrega" (OFT0-262) para mostrar "Stock actual".
  stockActual: number | null;
}

export interface ProductoPresentacionesPagina {
  productos: ProductoPresentacion[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
