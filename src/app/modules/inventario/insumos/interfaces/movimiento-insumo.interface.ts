import { UnidadMedida } from './insumo.interface';

export type TipoMovimientoInsumo = 'entrada' | 'salida' | 'ajuste';

export interface FilaMovimientoInsumoForm {
  id: number;
  insumoId: string;
  // Se usa (y se valida) en 'entrada' y 'ajuste': el backend pide un lote ya
  // existente puntual, no el insumo en general. En 'salida' el backend
  // elige el/los lotes solo por FEFO, asi que esto queda vacio y sin usar.
  loteId: string;
  // En 'entrada'/'salida' es la cantidad a mover (magnitud, siempre
  // positiva — el signo lo da tipoMovimiento). En 'ajuste' es otra cosa: la
  // cantidad REAL del lote despues de un conteo fisico, no un delta — el
  // delta con signo que de verdad viaja al backend se calcula restando
  // contra lote.cantidadActual (ver movimiento-form-modal.ts), la persona
  // nunca lo escribe a mano.
  cantidad: string;
}

export interface MovimientoInsumoForm {
  tipoMovimiento: TipoMovimientoInsumo;
  motivoGeneral: string;
  filas: FilaMovimientoInsumoForm[];
}

export function filaMovimientoVacia(id: number): FilaMovimientoInsumoForm {
  return { id, insumoId: '', loteId: '', cantidad: '' };
}

// --- Historial de movimientos (GET /movimientos-insumo) ---
// Mismos 3 tipos que TipoMovimientoInsumo (el form ya los soporta todos) —
// alias en vez de duplicar la union, para que no se desincronicen.
export type TipoMovimientoInsumoHistorial = TipoMovimientoInsumo;

export interface MovimientoInsumo {
  id: number;
  codigo: string;
  loteInsumoId: number;
  codigoLote: string;
  insumoId: number;
  insumoNombre: string;
  insumoSku: string;
  insumoUnidadMedida: UnidadMedida;
  tipo: TipoMovimientoInsumoHistorial;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  razon: string;
  fecha: string;
}

export interface MovimientosInsumoPagina {
  movimientos: MovimientoInsumo[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
