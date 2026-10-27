// Espejo del contrato real de GET /api/v1/producto-presentaciones,
// GET /categorias, GET /presentaciones y GET /productos-terminados/indicadores
// (confirmado por el backend). Mismo contrato que ya consume el modulo de
// catalogo (ventas/catalogo) — no se reusa de ahi a proposito, cada modulo
// de dominio es autocontenido en este repo (sin imports cruzados entre
// modules/).
export interface CategoriaDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export type UnidadMedidaPresentacionDto = 'kg' | 'gr';

export interface PresentacionDto {
  id: number;
  cantidad: number;
  unidad_medida: UnidadMedidaPresentacionDto;
  descripcion: string | null;
  estado: boolean;
}

export interface ProductoTerminadoDto {
  // Id propio del recurso producto_terminado — distinto del
  // producto_presentacion_id (son dos PKs distintas, confirmado por el
  // backend al agregar este campo para OFT0-259). Es el id que hay que usar
  // en /movimientos-producto-terminado y /lotes-producto-terminado, no el
  // id de ProductoPresentacion.
  id: number;
  stock_actual: number;
  stock_minimo: number;
  // Sin tope definido — confirmado por el backend que puede venir null (asi
  // se crea por defecto al dar de alta una presentacion). Cuando es null,
  // el nivel nunca cuenta como "alto" (ver calcularNivelStockProducto).
  stock_maximo: number | null;
}

// Una fila del listado: la presentacion de un producto con su stock. El
// catalogo (categoria, precios, promocion) viene embebido via JOIN, no hace
// falta pedirlo aparte.
export interface ProductoPresentacionDto {
  id: number;
  sku: string;
  estado: boolean;
  producto_id: number;
  presentacion_id: number;
  producto: {
    id: number;
    nombre: string;
    descripcion: string | null;
    categoria: { id: number; nombre: string };
  };
  presentacion: {
    id: number;
    cantidad: number;
    unidad_medida: UnidadMedidaPresentacionDto;
  };
  // Puede venir null en el caso rarisimo de que no se haya creado
  // (confirmado por el backend que no deberia pasar en la practica) — se
  // trata como stock 0 / sin tope en el mapper.
  producto_terminado: ProductoTerminadoDto | null;
}

export interface PageDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface IndicadoresProductoTerminadoDto {
  total: number;
  normal: number;
  alto: number;
  bajo: number;
  agotado: number;
}

// PATCH /productos-terminados/:producto_presentacion_id — cualquiera de los
// dos campos, no hace falta mandar ambos (confirmado por el backend).
export interface ActualizarStockProductoTerminadoRequestDto {
  stock_minimo?: number;
  stock_maximo?: number;
}
