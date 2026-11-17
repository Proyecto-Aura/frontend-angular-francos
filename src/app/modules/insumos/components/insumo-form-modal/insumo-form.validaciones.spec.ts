import { InsumoForm } from '../../interfaces/insumo.interface';
import { validarInsumoForm } from './insumo-form.validaciones';

function makeForm(overrides: Partial<InsumoForm> = {}): InsumoForm {
  return {
    nombre: 'Harina especial',
    descripcion: '',
    tipo: 'materia_prima',
    unidadMedida: 'kg',
    stockMinimo: '10',
    stockMaximo: '100',
    ...overrides,
  };
}

describe('validarInsumoForm', () => {
  it('returns no errors for a valid form', () => {
    expect(validarInsumoForm(makeForm())).toEqual({});
  });

  it('requires nombre and caps it at 150 characters', () => {
    expect(validarInsumoForm(makeForm({ nombre: '  ' })).nombre).toBe('El nombre es obligatorio.');
    expect(validarInsumoForm(makeForm({ nombre: 'a'.repeat(151) })).nombre).toBe(
      'Máximo 150 caracteres.',
    );
  });

  it('caps descripcion at 255 characters but allows it empty', () => {
    expect(validarInsumoForm(makeForm({ descripcion: '' })).descripcion).toBeUndefined();
    expect(validarInsumoForm(makeForm({ descripcion: 'a'.repeat(256) })).descripcion).toBe(
      'Máximo 255 caracteres.',
    );
  });

  it('requires tipo and unidadMedida', () => {
    const errores = validarInsumoForm(makeForm({ tipo: '', unidadMedida: '' }));
    expect(errores.tipo).toBe('Requerido.');
    expect(errores.unidadMedida).toBe('Requerido.');
  });

  it('requires stockMinimo/stockMaximo and validates the number format', () => {
    expect(validarInsumoForm(makeForm({ stockMinimo: '' })).stockMinimo).toBe('Requerido.');
    expect(validarInsumoForm(makeForm({ stockMinimo: 'abc' })).stockMinimo).toBe(
      'Debe ser un número válido (hasta 2 decimales).',
    );
    expect(validarInsumoForm(makeForm({ stockMaximo: '10.123' })).stockMaximo).toBe(
      'Debe ser un número válido (hasta 2 decimales).',
    );
  });

  it('allows stockMaximo equal to stockMinimo but rejects strictly less', () => {
    expect(
      validarInsumoForm(makeForm({ stockMinimo: '50', stockMaximo: '50' })).stockMaximo,
    ).toBeUndefined();
    expect(validarInsumoForm(makeForm({ stockMinimo: '50', stockMaximo: '49' })).stockMaximo).toBe(
      'Debe ser mayor o igual que el stock mínimo.',
    );
  });
});
