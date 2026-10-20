import { validarObjetivoForm } from '../../../negocio/components/objetivo-estrategico-form-modal/objetivo-estrategico-form.validaciones';
import { ObjetivoEstrategicoTiForm } from '../../interfaces/objetivo-estrategico-ti.interface';

export type ObjetivoEstrategicoTiFormErrores = Partial<
  Record<'nombre' | 'responsable' | 'perspectivaId' | 'oeNegocioId', string>
>;

export function validarObjetivoTiForm(
  form: ObjetivoEstrategicoTiForm,
): ObjetivoEstrategicoTiFormErrores {
  const errores: ObjetivoEstrategicoTiFormErrores = validarObjetivoForm(form);

  if (form.oeNegocioId === null) {
    errores.oeNegocioId = 'Selecciona un objetivo de negocio.';
  }

  return errores;
}
