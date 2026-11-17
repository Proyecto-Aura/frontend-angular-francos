import { MovimientoProductoTerminadoForm } from '../../interfaces/movimiento-producto-terminado.interface';

export interface FilaMovimientoProductoTerminadoErrores {
  productoTerminadoId?: string;
  loteId?: string;
  cantidad?: string;
}

export interface MovimientoProductoTerminadoFormErrores {
  motivoGeneral?: string;
  filas?: string;
  porFila?: Record<number, FilaMovimientoProductoTerminadoErrores>;
}

export function validarMovimientoProductoTerminadoForm(
  form: MovimientoProductoTerminadoForm,
): MovimientoProductoTerminadoFormErrores {
  const errores: MovimientoProductoTerminadoFormErrores = {};

  if (!form.motivoGeneral.trim()) {
    errores.motivoGeneral = 'Requerido.';
  }

  if (form.filas.length === 0) {
    errores.filas = 'Agrega al menos un producto.';
    return errores;
  }

  // El backend pide lote_producto_terminado_id en 'entrada' y 'ajuste'
  // (ambos apuntan a un lote existente puntual) — en 'salida' el reparto
  // entre lotes lo decide solo por FEFO, asi que ahi no hace falta elegir
  // ninguno (mismo criterio que movimientos-insumo).
  const requiereLote = form.tipoMovimiento === 'entrada' || form.tipoMovimiento === 'ajuste';
  // En 'ajuste' el campo "cantidad" es la cantidad REAL contada (no un
  // delta) — 0 es un valor valido (lote agotado), asi que ahi no exige > 0
  // como entrada/salida, solo que no sea negativo.
  const esAjuste = form.tipoMovimiento === 'ajuste';

  const porFila: Record<number, FilaMovimientoProductoTerminadoErrores> = {};
  for (const fila of form.filas) {
    const filaErrores: FilaMovimientoProductoTerminadoErrores = {};
    if (!fila.productoTerminadoId) {
      filaErrores.productoTerminadoId = 'Selecciona un producto.';
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
  // repetirse es el producto.
  const claves = requiereLote
    ? form.filas.map((fila) => fila.loteId)
    : form.filas.map((fila) => fila.productoTerminadoId);
  const hayDuplicados = claves
    .filter(Boolean)
    .some((clave, indice, vistos) => vistos.indexOf(clave) !== indice);
  if (hayDuplicados) {
    errores.filas = requiereLote
      ? 'No puedes repetir el mismo lote en dos filas.'
      : 'No puedes repetir el mismo producto en dos filas.';
  }

  return errores;
}
