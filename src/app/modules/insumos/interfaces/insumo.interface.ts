// Espejo del contrato real de POST/GET /api/v1/insumos (confirmado por el
// backend para OFT0-254): id, sku, nombre, descripcion, unidad_medida,
// stock_actual, stock_minimo, stock_maximo, tipo, estado.
export type UnidadMedida = 'kg' | 'litros' | 'unidad';
export type TipoInsumo = 'materia_prima' | 'empaque';
export type NivelStock = 'normal' | 'alto' | 'bajo' | 'agotado';

export interface Insumo {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: UnidadMedida;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  tipo: TipoInsumo;
  estado: boolean;
}

export interface InsumosPagina {
  insumos: Insumo[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface ResumenInsumos {
  total: number;
  normal: number;
  alto: number;
  bajo: number;
  agotados: number;
}

// Campos numericos como string porque vienen de <app-ds-input type="text">
// (mismo patron que PlanEstrategicoForm.anioInicio/anioFin) — se parsean a
// number recien al armar el request. Sin stock inicial: sin modulo de
// movimientos/kardex todavia, un insumo nuevo siempre arranca en
// stock_actual = 0 (regla fija, no la decide quien llena el formulario).
export interface InsumoForm {
  nombre: string;
  descripcion: string;
  tipo: TipoInsumo | '';
  unidadMedida: UnidadMedida | '';
  stockMinimo: string;
  stockMaximo: string;
}

// Mismo criterio que usa el backend en GET /insumos/indicadores — se
// recalcula aca por insumo (ese endpoint solo da los conteos agregados,
// no el nivel de cada fila) para que la columna "Nivel" de la tabla quede
// consistente con las tarjetas KPI.
export function calcularNivelStock(
  insumo: Pick<Insumo, 'stockActual' | 'stockMinimo' | 'stockMaximo'>,
): NivelStock {
  if (insumo.stockActual <= 0) return 'agotado';
  if (insumo.stockActual < insumo.stockMinimo) return 'bajo';
  if (insumo.stockActual >= insumo.stockMinimo && insumo.stockActual > insumo.stockMaximo * 0.9) {
    return 'alto';
  }
  return 'normal';
}
