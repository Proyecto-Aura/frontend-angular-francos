import { ObjetivoEstrategicoForm } from '../../interfaces/objetivo-estrategico.interface';

export type ObjetivoEstrategicoFormErrores = Partial<
  Record<'nombre' | 'responsable' | 'perspectivaId', string>
>;

export function validarObjetivoForm(form: ObjetivoEstrategicoForm): ObjetivoEstrategicoFormErrores {
  const errores: ObjetivoEstrategicoFormErrores = {};
  const nombre = form.nombre.trim();
  const responsable = form.responsable.trim();

  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.';
  } else if (nombre.length > 200) {
    errores.nombre = 'Máximo 200 caracteres.';
  }

  if (!responsable) {
    errores.responsable = 'El responsable es obligatorio.';
  } else if (responsable.length > 200) {
    errores.responsable = 'Máximo 200 caracteres.';
  }

  if (form.perspectivaId === null) {
    errores.perspectivaId = 'Selecciona una perspectiva.';
  }

  return errores;
}
