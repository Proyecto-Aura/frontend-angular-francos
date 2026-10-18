import { BadgeTone } from '../../../../../shared/ds/badge/badge';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { EstadoIniciativaCodigo, IniciativaForm } from '../../interfaces/iniciativa.interface';

export type ErroresIniciativaForm = Partial<Record<keyof IniciativaForm, string>>;

export function validarFormularioIniciativa(
  form: IniciativaForm,
  plan: PlanEstrategico,
): ErroresIniciativaForm {
  const errores: ErroresIniciativaForm = {};
  const nombre = form.nombre.trim();
  const responsable = form.responsable.trim();

  if (!nombre) errores.nombre = 'El nombre es obligatorio.';
  else if (nombre.length > 200) errores.nombre = 'El nombre admite hasta 200 caracteres.';
  if (form.objetivoId === null) errores.objetivoId = 'Requerido.';
  if (!responsable) errores.responsable = 'El responsable es obligatorio.';
  else if (responsable.length > 200) {
    errores.responsable = 'El responsable admite hasta 200 caracteres.';
  }
  const presupuesto = form.presupuesto.trim();
  if (presupuesto) {
    const valor = Number(presupuesto);
    if (!Number.isFinite(valor) || valor < 0) {
      errores.presupuesto = 'El presupuesto debe ser un número mayor o igual a 0.';
    } else if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(presupuesto)) {
      errores.presupuesto = 'Máximo 10 enteros y 2 decimales.';
    }
  }
  if (!form.fechaInicio) errores.fechaInicio = 'La fecha de inicio es obligatoria.';
  else if (!fechaEnRango(form.fechaInicio, plan)) {
    errores.fechaInicio = 'Fuera del rango del plan.';
  }
  if (!form.fechaFin) errores.fechaFin = 'La fecha de fin es obligatoria.';
  else if (!fechaEnRango(form.fechaFin, plan)) errores.fechaFin = 'Fuera del rango del plan.';
  if (form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio) {
    errores.fechaFin = 'Debe ser posterior a la fecha de inicio.';
  }
  return errores;
}

export function validarMotivoCancelacion(motivo: string): string | null {
  const motivoLimpio = motivo.trim();
  if (!motivoLimpio) return 'El motivo de cancelación es obligatorio.';
  if (motivoLimpio.length > 500) return 'El motivo admite hasta 500 caracteres.';
  return null;
}

export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  const meses = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  const indiceMes = Number(mes) - 1;
  if (!anio || !dia || indiceMes < 0 || indiceMes >= meses.length) return iso;
  return `${Number(dia)} ${meses[indiceMes]} ${anio}`;
}

export function formatearPresupuesto(valor: number | null): string {
  if (valor === null) return '—';
  return `S/ ${new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(valor)}`;
}

export function siguienteEstado(codigo: EstadoIniciativaCodigo): EstadoIniciativaCodigo | null {
  if (codigo === 'PENDIENTE') return 'EN_PROCESO';
  if (codigo === 'EN_PROCESO') return 'COMPLETADA';
  return null;
}

export function puedeCancelar(codigo: EstadoIniciativaCodigo): boolean {
  return codigo === 'PENDIENTE' || codigo === 'EN_PROCESO';
}

export function tonoEstado(codigo: EstadoIniciativaCodigo): BadgeTone {
  if (codigo === 'EN_PROCESO') return 'warning';
  if (codigo === 'COMPLETADA') return 'success';
  if (codigo === 'CANCELADA') return 'danger';
  return 'neutral';
}

function fechaEnRango(fecha: string, plan: PlanEstrategico): boolean {
  const anio = Number(fecha.slice(0, 4));
  return anio >= plan.anioInicio && anio <= plan.anioFin;
}
