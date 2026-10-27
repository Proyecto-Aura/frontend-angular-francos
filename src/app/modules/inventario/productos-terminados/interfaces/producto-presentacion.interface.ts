export type UnidadMedidaPresentacion = 'kg' | 'gr';
export type NivelStockProducto = 'normal' | 'alto' | 'bajo' | 'agotado';

export interface ProductoPresentacion {
  id: number;
  // Id del recurso producto_terminado (distinto de este "id") — null en el
  // caso rarisimo de que producto_terminado no se haya creado (ver
  // ProductoTerminadoDto). Es el id que hay que mandar a
  // /movimientos-producto-terminado y /lotes-producto-terminado.
  productoTerminadoId: number | null;
  sku: string;
  productoNombre: string;
  productoDescripcion: string | null;
  categoriaId: number;
  categoriaNombre: string;
  presentacionId: number;
  presentacionCantidad: number;
  presentacionUnidadMedida: UnidadMedidaPresentacion;
  estado: boolean;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number | null;
}

export interface ProductoPresentacionesPagina {
  productos: ProductoPresentacion[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface ResumenProductosTerminados {
  total: number;
  normal: number;
  alto: number;
  bajo: number;
  agotados: number;
}

export interface CategoriaOption {
  id: number;
  nombre: string;
}

export interface PresentacionOption {
  id: number;
  cantidad: number;
  unidadMedida: UnidadMedidaPresentacion;
}

// Campo como string porque viene de <app-ds-input> — se parsea a number
// recien al armar el request. Vacio = "no cambiar este campo" (el PATCH
// acepta mandar solo uno de los dos).
export interface EditarStockForm {
  stockMinimo: string;
  stockMaximo: string;
}

// Mismo criterio que calcularNivelStock() de insumos (90%), confirmado por
// el backend para producto terminado — con una diferencia: stock_maximo
// puede ser null (sin tope definido), y en ese caso nunca cuenta como
// "alto".
export function calcularNivelStockProducto(
  p: Pick<ProductoPresentacion, 'stockActual' | 'stockMinimo' | 'stockMaximo'>,
): NivelStockProducto {
  if (p.stockActual <= 0) return 'agotado';
  if (p.stockActual < p.stockMinimo) return 'bajo';
  if (
    p.stockMaximo !== null &&
    p.stockActual >= p.stockMinimo &&
    p.stockActual > p.stockMaximo * 0.9
  ) {
    return 'alto';
  }
  return 'normal';
}
