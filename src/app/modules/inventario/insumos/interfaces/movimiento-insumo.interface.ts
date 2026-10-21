// Forma del movimiento de insumo tal como lo arma el formulario. Estatico
// por ahora: el backend todavia no definio el endpoint ni el contrato real
// (ver TODO en movimiento-form-modal.ts), asi que esto es lo que el
// formulario necesita para validar y mostrar, no un DTO confirmado.
export type TipoMovimientoInsumo = 'entrada' | 'salida';

export interface FilaMovimientoInsumoForm {
  id: number;
  insumoId: string;
  // Solo se usa (y se valida) cuando tipoMovimiento === 'entrada': el
  // backend pide sumar la cantidad a un lote YA EXISTENTE puntual, no al
  // insumo en general. En 'salida' el backend elige el/los lotes solo por
  // FEFO, asi que esto queda vacio y sin usar.
  loteId: string;
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
