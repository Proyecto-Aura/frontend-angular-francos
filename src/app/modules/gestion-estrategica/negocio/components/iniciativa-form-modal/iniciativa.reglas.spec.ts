import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { EstadoIniciativaCodigo, IniciativaForm } from '../../interfaces/iniciativa.interface';
import {
  formatearFecha,
  formatearPresupuesto,
  puedeCancelar,
  siguienteEstado,
  tonoEstado,
  validarFormularioIniciativa,
  validarMotivoCancelacion,
} from './iniciativa.reglas';

function makePlan(): PlanEstrategico {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2026,
    anioFin: 2028,
    estadoCodigo: 'BORRADOR',
    estadoNombre: 'Borrador',
    activo: true,
  };
}

function makeForm(overrides: Partial<IniciativaForm> = {}): IniciativaForm {
  return {
    nombre: 'Programa de fidelización',
    descripcion: 'Alcance',
    objetivoId: 20,
    responsable: 'Ana Torres',
    fechaInicio: '2026-01-15',
    fechaFin: '2028-12-15',
    presupuesto: '15000.50',
    ...overrides,
  };
}

describe('iniciativa reglas', () => {
  it.each([
    [{ nombre: ' ' }, 'nombre', 'El nombre es obligatorio.'],
    [{ nombre: 'a'.repeat(201) }, 'nombre', 'El nombre admite hasta 200 caracteres.'],
    [{ objetivoId: null }, 'objetivoId', 'Requerido.'],
    [{ responsable: ' ' }, 'responsable', 'El responsable es obligatorio.'],
    [
      { responsable: 'a'.repeat(201) },
      'responsable',
      'El responsable admite hasta 200 caracteres.',
    ],
    [{ fechaInicio: '' }, 'fechaInicio', 'La fecha de inicio es obligatoria.'],
    [{ fechaFin: '' }, 'fechaFin', 'La fecha de fin es obligatoria.'],
    [{ fechaInicio: '2025-12-31' }, 'fechaInicio', 'Fuera del rango del plan.'],
    [{ fechaFin: '2029-01-01' }, 'fechaFin', 'Fuera del rango del plan.'],
    [
      { fechaInicio: '2027-05-01', fechaFin: '2027-04-30' },
      'fechaFin',
      'Debe ser posterior a la fecha de inicio.',
    ],
  ] as const)('validates %s', (overrides, field, message) => {
    expect(validarFormularioIniciativa(makeForm(overrides), makePlan())[field]).toBe(message);
  });

  it.each([
    ['', undefined],
    ['0', undefined],
    ['-1', 'El presupuesto debe ser un número mayor o igual a 0.'],
    ['no-numero', 'El presupuesto debe ser un número mayor o igual a 0.'],
    ['10.123', 'Máximo 10 enteros y 2 decimales.'],
    ['10000000000', 'Máximo 10 enteros y 2 decimales.'],
  ])('validates budget %s', (presupuesto, expected) => {
    expect(validarFormularioIniciativa(makeForm({ presupuesto }), makePlan()).presupuesto).toBe(
      expected,
    );
  });

  it('accepts a valid form without errors', () => {
    expect(validarFormularioIniciativa(makeForm(), makePlan())).toEqual({});
  });

  it.each([
    ['', 'El motivo de cancelación es obligatorio.'],
    ['   ', 'El motivo de cancelación es obligatorio.'],
    ['a'.repeat(501), 'El motivo admite hasta 500 caracteres.'],
    ['a'.repeat(500), null],
    ['Se reasignó el presupuesto', null],
  ])('validates cancellation reason', (motivo, expected) => {
    expect(validarMotivoCancelacion(motivo)).toBe(expected);
  });

  it.each([
    ['2026-01-15', '15 Ene 2026'],
    ['2026-01-15T00:00:00.000Z', '15 Ene 2026'],
    ['valor inválido', 'valor inválido'],
  ])('formats date %s', (value, expected) => {
    expect(formatearFecha(value)).toBe(expected);
  });

  it.each([
    [null, '—'],
    [15000, 'S/ 15,000'],
    [15000.5, 'S/ 15,000.5'],
    [15000.55, 'S/ 15,000.55'],
  ])('formats budget %s', (value, expected) => {
    expect(formatearPresupuesto(value)).toBe(expected);
  });

  it.each([
    ['PENDIENTE', 'EN_PROCESO', true, 'neutral'],
    ['EN_PROCESO', 'COMPLETADA', true, 'warning'],
    ['COMPLETADA', null, false, 'success'],
    ['CANCELADA', null, false, 'danger'],
  ] as const)('maps helpers for state %s', (state, next, cancellable, tone) => {
    expect(siguienteEstado(state as EstadoIniciativaCodigo)).toBe(next);
    expect(puedeCancelar(state as EstadoIniciativaCodigo)).toBe(cancellable);
    expect(tonoEstado(state as EstadoIniciativaCodigo)).toBe(tone);
  });
});
