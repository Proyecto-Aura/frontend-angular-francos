import {
  PlanEstrategico,
  PlanEstrategicoForm,
} from '../../interfaces/plan-estrategico.interface';
import { seSolapa, validarPlanForm } from './plan-estrategico-form.validaciones';

function makeForm(overrides: Partial<PlanEstrategicoForm> = {}): PlanEstrategicoForm {
  return {
    nombre: 'Plan institucional',
    descripcion: '',
    anioInicio: '2025',
    anioFin: '2027',
    ...overrides,
  };
}

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan existente',
    descripcion: null,
    anioInicio: 2025,
    anioFin: 2027,
    estadoCodigo: 'BORRADOR',
    estadoNombre: 'Borrador',
    activo: true,
    ...overrides,
  };
}

describe('planEstrategicoFormValidaciones', () => {
  describe('validarPlanForm', () => {
    it.each(['', '   '])('requires a non-empty name', (nombre) => {
      expect(validarPlanForm(makeForm({ nombre })).nombre).toBe('El nombre es obligatorio.');
    });

    it('rejects names longer than 200 characters', () => {
      expect(validarPlanForm(makeForm({ nombre: 'a'.repeat(201) })).nombre).toBe(
        'Máximo 200 caracteres.',
      );
    });

    it('requires both years', () => {
      expect(validarPlanForm(makeForm({ anioInicio: '', anioFin: '' }))).toMatchObject({
        anioInicio: 'Requerido.',
        anioFin: 'Requerido.',
      });
    });

    it.each([
      ['2025', '2025'],
      ['2025', '2024'],
    ])('requires the end year to be after the start year', (anioInicio, anioFin) => {
      expect(validarPlanForm(makeForm({ anioInicio, anioFin })).anioFin).toBe(
        'Debe ser posterior al año de inicio.',
      );
    });

    it('returns no errors for a valid form', () => {
      expect(validarPlanForm(makeForm())).toEqual({});
    });
  });

  describe('seSolapa', () => {
    it('detects ranges that touch at one endpoint', () => {
      expect(seSolapa(2027, 2029, [makePlan()])).toBe(true);
    });

    it('detects a range contained in an existing plan', () => {
      expect(seSolapa(2026, 2027, [makePlan({ anioInicio: 2024, anioFin: 2028 })])).toBe(true);
    });

    it('returns false for separated ranges', () => {
      expect(seSolapa(2028, 2030, [makePlan()])).toBe(false);
    });

    it('returns false for an empty plan list', () => {
      expect(seSolapa(2025, 2027, [])).toBe(false);
    });
  });
});
