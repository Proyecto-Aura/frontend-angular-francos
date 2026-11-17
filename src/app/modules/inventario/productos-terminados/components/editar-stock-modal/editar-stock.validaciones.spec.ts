import { EditarStockForm } from '../../interfaces/producto-presentacion.interface';
import { validarEditarStockForm } from './editar-stock.validaciones';

function makeForm(overrides: Partial<EditarStockForm> = {}): EditarStockForm {
  return { stockMinimo: '10', stockMaximo: '300', ...overrides };
}

describe('validarEditarStockForm', () => {
  it('returns no errors for a valid form', () => {
    expect(validarEditarStockForm(makeForm())).toEqual({});
  });

  it('requires stockMinimo', () => {
    expect(validarEditarStockForm(makeForm({ stockMinimo: '' }))).toEqual({
      stockMinimo: 'Requerido.',
    });
  });

  it('requires stockMaximo', () => {
    expect(validarEditarStockForm(makeForm({ stockMaximo: '' }))).toEqual({
      stockMaximo: 'Requerido.',
    });
  });

  it('rejects a negative stockMinimo', () => {
    expect(validarEditarStockForm(makeForm({ stockMinimo: '-1' }))).toEqual({
      stockMinimo: 'Debe ser un número válido, mayor o igual a 0.',
    });
  });

  it('rejects a non-numeric stockMaximo', () => {
    expect(validarEditarStockForm(makeForm({ stockMaximo: 'abc' }))).toEqual({
      stockMaximo: 'Debe ser un número válido, mayor o igual a 0.',
    });
  });

  it('rejects stockMaximo menor que stockMinimo', () => {
    expect(validarEditarStockForm(makeForm({ stockMinimo: '50', stockMaximo: '10' }))).toEqual({
      stockMaximo: 'Debe ser mayor o igual al stock mínimo.',
    });
  });

  it('allows stockMaximo igual a stockMinimo', () => {
    expect(validarEditarStockForm(makeForm({ stockMinimo: '50', stockMaximo: '50' }))).toEqual({});
  });
});
