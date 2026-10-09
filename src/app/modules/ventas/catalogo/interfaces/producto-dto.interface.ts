// Formas exactas de la API del catálogo: /productos, /producto-presentaciones,
// /promociones, /categorias y /presentaciones.
export interface PageDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface CategoriaDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export type UnidadMedidaDto = 'kg' | 'gr';

export interface PresentacionDto {
  id: number;
  cantidad: number;
  unidad_medida: UnidadMedidaDto;
  descripcion: string | null;
  estado: boolean;
}

export interface PromocionVigenteDto {
  id: number;
  nombre: string;
  valor: number;
  fecha_inicio: string;
  fecha_fin: string;
}

/** Una fila del listado: la presentación de un producto con todo lo que muestra el catálogo. */
export interface ProductoPresentacionFilaDto {
  id: number;
  sku: string;
  precio_unitario: number;
  precio_mayorista: number | null;
  umbral_mayorista: number | null;
  producto_id: number;
  presentacion_id: number;
  imagen_url: string | null;
  slug: string | null;
  estado: boolean;
  visible_portal_b: boolean;
  producto: {
    id: number;
    nombre: string;
    descripcion: string | null;
    destacado: boolean;
    estado: boolean;
    categoria: { id: number; nombre: string };
  };
  presentacion: {
    id: number;
    cantidad: number;
    unidad_medida: UnidadMedidaDto;
    descripcion: string | null;
  };
  producto_terminado: {
    stock_actual: number;
    stock_minimo: number;
    stock_maximo: number | null;
  } | null;
  promocion_vigente: PromocionVigenteDto | null;
}

export interface CrearProductoPresentacionInlineRequestDto {
  presentacion_id: number;
  precio_unitario: number;
  precio_mayorista?: number;
  umbral_mayorista?: number;
  imagen_url?: string;
}

export interface CrearProductoRequestDto {
  categoria_id: number;
  nombre: string;
  descripcion?: string;
  destacado: boolean;
  producto_presentaciones: CrearProductoPresentacionInlineRequestDto[];
}

export interface ProductoCreadoDto {
  id: number;
  producto_presentaciones: { id: number; sku: string; presentacion_id: number }[];
}

export interface ActualizarProductoRequestDto {
  categoria_id: number;
  nombre: string;
  descripcion: string;
  destacado: boolean;
}

export interface CrearProductoPresentacionRequestDto extends CrearProductoPresentacionInlineRequestDto {
  producto_id: number;
}

export interface ActualizarProductoPresentacionRequestDto {
  precio_unitario: number;
  precio_mayorista: number | null;
  umbral_mayorista: number | null;
  imagen_url: string | null;
}

export interface CrearPromocionRequestDto {
  producto_presentacion_id: number;
  valor: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface ActualizarPromocionRequestDto {
  valor: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface ApiErrorDto {
  statusCode: number;
  message: string | string[];
}
