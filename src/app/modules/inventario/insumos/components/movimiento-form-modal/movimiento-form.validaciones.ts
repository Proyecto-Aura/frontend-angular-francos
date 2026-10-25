import { MovimientoInsumoForm } from '../../interfaces/movimiento-insumo.interface';

export interface FilaMovimientoErrores {
  insumoId?: string;
  loteId?: string;
  cantidad?: string;
}

export interface MovimientoFormErrores {
  motivoGeneral?: string;
  filas?: string;
  porFila?: Record<number, FilaMovimientoErrores>;
}

export function validarMovimientoForm(form: MovimientoInsumoForm): MovimientoFormErrores {
  const errores: MovimientoFormErrores = {};

  if (!form.motivoGeneral.trim()) {
    errores.motivoGeneral = 'Requerido.';
  }

  if (form.filas.length === 0) {
    errores.filas = 'Agrega al menos un insumo.';
    return errores;
  }

  // El backend pide lote_insumo_id en 'entrada' y 'ajuste' (ambos apuntan a
  // un lote existente puntual) — en 'salida' el reparto entre lotes lo
  // decide solo por FEFO, asi que ahi no hace falta elegir ninguno.
  const requiereLote = form.tipoMovimiento === 'entrada' || form.tipoMovimiento === 'ajuste';
  // En 'ajuste' el campo "cantidad" es la cantidad REAL contada (no un
  // delta) — 0 es un valor valido (lote agotado), asi que ahi no exige > 0
  // como entrada/salida, solo que no sea negativo.
  const esAjuste = form.tipoMovimiento === 'ajuste';

  const porFila: Record<number, FilaMovimientoErrores> = {};
  for (const fila of form.filas) {
    const filaErrores: FilaMovimientoErrores = {};
    if (!fila.insumoId) {
      filaErrores.insumoId = 'Selecciona un insumo.';
    }
    if (requiereLote && !fila.loteId) {
      filaErrores.loteId = 'Selecciona un lote.';
    }
    if (fila.cantidad === '' || Number.isNaN(Number(fila.cantidad))) {
      filaErrores.cantidad = esAjuste ? 'Ingresa la cantidad real.' : 'Debe ser mayor a 0.';
    } else if (esAjuste ? Number(fila.cantidad) < 0 : Number(fila.cantidad) <= 0) {
      filaErrores.cantidad = esAjuste ? 'No puede ser negativa.' : 'Debe ser mayor a 0.';
    }
    if (Object.keys(filaErrores).length > 0) {
      porFila[fila.id] = filaErrores;
    }
  }
  if (Object.keys(porFila).length > 0) {
    errores.porFila = porFila;
  }

  // En 'entrada'/'ajuste' lo que no puede repetirse es el lote (dos filas
  // del mismo lote deberian ser una sola). En 'salida' lo que no puede
  // repetirse es el insumo.
  const claves = requiereLote
    ? form.filas.map((fila) => fila.loteId)
    : form.filas.map((fila) => fila.insumoId);
  const hayDuplicados = claves
    .filter(Boolean)
    .some((clave, indice, vistos) => vistos.indexOf(clave) !== indice);
  if (hayDuplicados) {
    errores.filas = requiereLote
      ? 'No puedes repetir el mismo lote en dos filas.'
      : 'No puedes repetir el mismo insumo en dos filas.';
  }

  return errores;
}
