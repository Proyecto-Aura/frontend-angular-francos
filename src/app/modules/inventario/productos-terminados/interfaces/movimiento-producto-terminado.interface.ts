export type TipoMovimientoProductoTerminado = 'entrada' | 'salida' | 'ajuste';

export interface FilaMovimientoProductoTerminadoForm {
  id: number;
  productoTerminadoId: string;
  // Se usa (y se valida) en 'entrada' y 'ajuste': el backend pide un lote ya
  // existente puntual. En 'salida' el backend elige el/los lotes solo por
  // FEFO, asi que esto queda vacio y sin usar.
  loteId: string;
  // En 'entrada'/'salida' es la cantidad a mover (magnitud, siempre
  // positiva — el signo lo da tipoMovimiento). En 'ajuste' es la cantidad
  // REAL del lote despues de un conteo fisico, no un delta — el delta con
  // signo que de verdad viaja al backend se calcula restando contra
  // lote.cantidadActual (ver movimiento-producto-terminado-form-modal.ts).
  cantidad: string;
}

export interface MovimientoProductoTerminadoForm {
  tipoMovimiento: TipoMovimientoProductoTerminado;
  motivoGeneral: string;
  filas: FilaMovimientoProductoTerminadoForm[];
}

export function filaMovimientoProductoTerminadoVacia(
  id: number,
): FilaMovimientoProductoTerminadoForm {
  return { id, productoTerminadoId: '', loteId: '', cantidad: '' };
}

// --- Historial de movimientos (GET /movimientos-producto-terminado) ---
export type TipoMovimientoProductoTerminadoHistorial = TipoMovimientoProductoTerminado;

export interface MovimientoProductoTerminado {
  id: number;
  codigo: string;
  loteProductoTerminadoId: number;
  codigoLote: string;
  productoTerminadoId: number;
  sku: string;
  productoNombre: string;
  categoriaNombre: string;
  presentacionCantidad: number;
  presentacionUnidadMedida: 'kg' | 'gr';
  tipo: TipoMovimientoProductoTerminadoHistorial;
  cantidad: number;
  stockAnterior: number;
  stockResultante: number;
  razon: string;
  fecha: string;
}

export interface MovimientosProductoTerminadoPagina {
  movimientos: MovimientoProductoTerminado[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
