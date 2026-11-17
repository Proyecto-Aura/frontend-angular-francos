import { EditarStockForm } from '../../interfaces/producto-presentacion.interface';

export interface EditarStockErrores {
  stockMinimo?: string;
  stockMaximo?: string;
}

// Ambos campos llegan siempre prellenados con el valor actual del producto
// y son requeridos en esta UI (a diferencia del backend, que via PATCH
// acepta mandar solo uno de los dos) — asi no se puede guardar con uno
// vacio por error.
export function validarEditarStockForm(form: EditarStockForm): EditarStockErrores {
  const errores: EditarStockErrores = {};

  if (form.stockMinimo === '') {
    errores.stockMinimo = 'Requerido.';
  } else {
    const minimo = Number(form.stockMinimo);
    if (Number.isNaN(minimo) || minimo < 0) {
      errores.stockMinimo = 'Debe ser un número válido, mayor o igual a 0.';
    }
  }

  if (form.stockMaximo === '') {
    errores.stockMaximo = 'Requerido.';
  } else {
    const maximo = Number(form.stockMaximo);
    if (Number.isNaN(maximo) || maximo < 0) {
      errores.stockMaximo = 'Debe ser un número válido, mayor o igual a 0.';
    }
  }

  if (
    !errores.stockMinimo &&
    !errores.stockMaximo &&
    Number(form.stockMaximo) < Number(form.stockMinimo)
  ) {
    errores.stockMaximo = 'Debe ser mayor o igual al stock mínimo.';
  }

  return errores;
}
