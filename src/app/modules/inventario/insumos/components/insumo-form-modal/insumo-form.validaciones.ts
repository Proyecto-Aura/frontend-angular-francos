import { InsumoForm } from '../../interfaces/insumo.interface';

export type InsumoFormErrores = Partial<
  Record<'nombre' | 'descripcion' | 'tipo' | 'unidadMedida' | 'stockMinimo' | 'stockMaximo', string>
>;

// Un numero valido para el backend: hasta 2 decimales, no negativo. Vacio no
// es valido aca — cada llamador decide si el campo es requerido o no.
function esNumeroValido(valor: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(valor.trim());
}

export function validarInsumoForm(form: InsumoForm): InsumoFormErrores {
  const errores: InsumoFormErrores = {};
  const nombre = form.nombre.trim();

  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.';
  } else if (nombre.length > 150) {
    errores.nombre = 'Máximo 150 caracteres.';
  }

  if (form.descripcion.trim().length > 255) {
    errores.descripcion = 'Máximo 255 caracteres.';
  }

  if (!form.tipo) {
    errores.tipo = 'Requerido.';
  }

  if (!form.unidadMedida) {
    errores.unidadMedida = 'Requerido.';
  }

  if (!form.stockMinimo.trim()) {
    errores.stockMinimo = 'Requerido.';
  } else if (!esNumeroValido(form.stockMinimo)) {
    errores.stockMinimo = 'Debe ser un número válido (hasta 2 decimales).';
  }

  if (!form.stockMaximo.trim()) {
    errores.stockMaximo = 'Requerido.';
  } else if (!esNumeroValido(form.stockMaximo)) {
    errores.stockMaximo = 'Debe ser un número válido (hasta 2 decimales).';
  }

  if (
    !errores.stockMinimo &&
    !errores.stockMaximo &&
    Number(form.stockMaximo) < Number(form.stockMinimo)
  ) {
    // El backend permite iguales (stock_maximo >= stock_minimo); solo el
    // estrictamente menor es invalido.
    errores.stockMaximo = 'Debe ser mayor o igual que el stock mínimo.';
  }

  return errores;
}
