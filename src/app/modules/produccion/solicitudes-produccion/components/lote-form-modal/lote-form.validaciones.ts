import { LoteProductoTerminadoForm } from '../../interfaces/lote-producto-terminado.interface';

export type LoteFormErrores = Partial<
  Record<'productoTerminadoId' | 'fechaVencimiento' | 'cantidadInicial', string>
>;

// Un numero valido para el backend: hasta 2 decimales, no negativo.
function esNumeroValido(valor: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(valor.trim());
}

// A diferencia de lote-insumo (donde la fecha de vencimiento es requerida
// salvo para insumos tipo "empaque"), aca siempre es opcional (confirmado
// por el backend) — un producto terminado no tiene un tipo equivalente que
// determine si vence o no.
export function validarLoteForm(form: LoteProductoTerminadoForm): LoteFormErrores {
  const errores: LoteFormErrores = {};

  if (!form.productoTerminadoId) {
    errores.productoTerminadoId = 'Selecciona un producto.';
  }

  if (
    form.fechaVencimiento &&
    form.fechaProduccion &&
    form.fechaVencimiento < form.fechaProduccion
  ) {
    // El backend tambien lo valida (400), pero se marca aca antes de llamar.
    errores.fechaVencimiento = 'Debe ser igual o posterior a la fecha de producción.';
  }

  if (!form.cantidadInicial.trim()) {
    errores.cantidadInicial = 'Requerido.';
  } else if (!esNumeroValido(form.cantidadInicial)) {
    errores.cantidadInicial = 'Debe ser un número válido (hasta 2 decimales).';
  }

  return errores;
}
