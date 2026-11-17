import { LoteInsumoForm } from '../../interfaces/lote-insumo.interface';

export type LoteFormErrores = Partial<
  Record<'insumoId' | 'fechaVencimiento' | 'cantidadInicial', string>
>;

// Un numero valido para el backend: hasta 2 decimales, no negativo. Vacio no
// es valido aca — cada llamador decide si el campo es requerido o no (mismo
// criterio que insumo-form.validaciones.ts).
function esNumeroValido(valor: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(valor.trim());
}

// requiereFechaVencimiento: false para insumos tipo "empaque" — confirmado
// con el backend, el campo es opcional para cualquier tipo del lado de
// ellos, pero solo tiene sentido de negocio en materia_prima (los empaques
// no vencen). Default true para no romper el caso sin insumo seleccionado
// todavia (ahi ya se marca el error de insumoId).
export function validarLoteForm(
  form: LoteInsumoForm,
  requiereFechaVencimiento = true,
): LoteFormErrores {
  const errores: LoteFormErrores = {};

  if (!form.insumoId) {
    errores.insumoId = 'Selecciona un insumo.';
  }

  if (requiereFechaVencimiento && !form.fechaVencimiento) {
    errores.fechaVencimiento = 'Requerido.';
  } else if (
    form.fechaVencimiento &&
    form.fechaIngreso &&
    form.fechaVencimiento < form.fechaIngreso
  ) {
    // El backend tambien lo valida (409), pero se marca aca antes de llamar.
    errores.fechaVencimiento = 'Debe ser igual o posterior a la fecha de ingreso.';
  }

  if (!form.cantidadInicial.trim()) {
    errores.cantidadInicial = 'Requerido.';
  } else if (!esNumeroValido(form.cantidadInicial)) {
    errores.cantidadInicial = 'Debe ser un número válido (hasta 2 decimales).';
  }

  return errores;
}
