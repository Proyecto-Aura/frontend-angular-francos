export type TipoStock = 'productos' | 'insumos';

/** Un producto terminado (presentación) o un insumo con su stock de alerta. */
export interface ItemStockMinimo {
  tipo: TipoStock;
  /** Id que usa el backend para editar: producto_presentacion_id o id del insumo. */
  id: number;
  sku: string;
  nombre: string;
  /** Presentación (500 gr) o tipo de insumo (Materia prima / Empaque). */
  detalle: string;
  /** Unidad en la que se cuenta el stock: und, kg, litros. */
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  /** Sin tope definido en los productos terminados nuevos. */
  stockMaximo: number | null;
  activo: boolean;
}

export interface PaginaStockMinimo {
  items: ItemStockMinimo[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export type NivelAlerta = 'agotado' | 'bajo' | 'normal' | 'alto';

/** Mismo criterio que los indicadores del backend: alto es más del 90% del máximo. */
export const PORCENTAJE_ALTO = 90;

export function nivelDe(
  item: Pick<ItemStockMinimo, 'stockActual' | 'stockMinimo' | 'stockMaximo'>,
): NivelAlerta {
  if (item.stockActual <= 0) return 'agotado';
  if (item.stockActual < item.stockMinimo) return 'bajo';
  if (
    item.stockMaximo !== null &&
    item.stockMaximo > 0 &&
    (item.stockActual / item.stockMaximo) * 100 > PORCENTAJE_ALTO
  ) {
    return 'alto';
  }
  return 'normal';
}

export const ETIQUETA_NIVEL: Record<NivelAlerta, string> = {
  agotado: 'Agotado',
  bajo: 'Bajo',
  normal: 'Normal',
  alto: 'Alto',
};

export function formatearStock(valor: number): string {
  return valor.toLocaleString('es-PE', { maximumFractionDigits: 2 });
}

/** Texto de cantidad con su unidad: "20 kg". */
export function formatearCantidad(valor: number, unidad: string): string {
  return `${formatearStock(valor)} ${unidad}`;
}

export interface ErroresStock {
  minimo?: string;
  maximo?: string;
}

const NUMERO_VALIDO = /^\d+(\.\d{1,2})?$/;
const MENSAJE_NUMERO = 'Número mayor o igual a 0, hasta 2 decimales';

/** Convierte lo escrito (acepta coma decimal) a número; null si está vacío o es inválido. */
export function parsearNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  return NUMERO_VALIDO.test(limpio) ? Number(limpio) : null;
}

/**
 * Valida mínimo y máximo escritos (texto). El mínimo siempre es obligatorio; el máximo solo en
 * insumos (en productos terminados es opcional). Si se escribe, debe ser mayor a 0 y no menor
 * al mínimo.
 */
export function validarParametrosStock(
  minimo: string,
  maximo: string,
  maximoObligatorio: boolean,
): ErroresStock {
  const errores: ErroresStock = {};
  const min = parsearNumero(minimo);
  const max = parsearNumero(maximo);

  if (!minimo.trim()) errores.minimo = 'Ingresar el stock mínimo';
  else if (min === null) errores.minimo = MENSAJE_NUMERO;

  if (!maximo.trim()) {
    if (maximoObligatorio) errores.maximo = 'Ingresar el stock máximo';
  } else if (max === null) {
    errores.maximo = MENSAJE_NUMERO;
  } else if (max <= 0) {
    // Los niveles "alto" y "normal" se calculan como porcentaje del máximo.
    errores.maximo = 'El stock máximo debe ser mayor a 0';
  } else if (min !== null && max < min) {
    errores.maximo = 'El stock máximo debe ser mayor o igual que el stock mínimo';
  }
  return errores;
}
