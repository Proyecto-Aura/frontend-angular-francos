import {
  PlanEstrategico,
  PlanEstrategicoForm,
} from '../../interfaces/plan-estrategico.interface';

export type PlanEstrategicoFormErrores = Partial<
  Record<'nombre' | 'anioInicio' | 'anioFin', string>
>;

export function validarPlanForm(
  form: PlanEstrategicoForm,
): PlanEstrategicoFormErrores {
  const errores: PlanEstrategicoFormErrores = {};
  const nombre = form.nombre.trim();

  if (!nombre) {
    errores.nombre = 'El nombre es obligatorio.';
  } else if (nombre.length > 200) {
    errores.nombre = 'Máximo 200 caracteres.';
  }

  if (!form.anioInicio) {
    errores.anioInicio = 'Requerido.';
  }

  if (!form.anioFin) {
    errores.anioFin = 'Requerido.';
  }

  if (!errores.anioInicio && !errores.anioFin && Number(form.anioFin) <= Number(form.anioInicio)) {
    errores.anioFin = 'Debe ser posterior al año de inicio.';
  }

  return errores;
}

export function seSolapa(
  anioInicio: number,
  anioFin: number,
  planes: PlanEstrategico[],
): boolean {
  return planes.some(plan => anioInicio <= plan.anioFin && anioFin >= plan.anioInicio);
}
