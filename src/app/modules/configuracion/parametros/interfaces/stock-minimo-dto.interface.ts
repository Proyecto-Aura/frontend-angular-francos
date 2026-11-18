// Solo los campos que la pantalla de parámetros de inventario necesita de
// GET /producto-presentaciones y GET /insumos (el módulo de configuración no importa DTOs de
// otros módulos).
export interface PaginaDto<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

export interface ProductoPresentacionStockDto {
  /** Es el producto_presentacion_id: el que va en `PATCH /productos-terminados/:id`. */
  id: number;
  sku: string;
  estado: boolean;
  producto: { nombre: string };
  presentacion: { cantidad: number; unidad_medida: string };
  /** Puede venir null si la presentación no tiene su registro de stock. */
  producto_terminado: {
    stock_actual: number;
    stock_minimo: number;
    stock_maximo: number | null;
  } | null;
}

export interface InsumoStockDto {
  id: number;
  sku: string;
  nombre: string;
  unidad_medida: string;
  tipo: string;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  estado: boolean;
}

/**
 * PATCH de `/productos-terminados/:id` y de `/insumos/:id`. `stock_maximo` se omite si no cambia
 * y va null solo para quitar el tope de un producto terminado.
 */
export interface ActualizarStockRequestDto {
  stock_minimo: number;
  stock_maximo?: number | null;
}
