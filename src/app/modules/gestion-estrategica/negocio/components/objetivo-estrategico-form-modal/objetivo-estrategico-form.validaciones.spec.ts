import { ObjetivoEstrategicoForm } from '../../interfaces/objetivo-estrategico.interface';
import { validarObjetivoForm } from './objetivo-estrategico-form.validaciones';

function makeForm(overrides: Partial<ObjetivoEstrategicoForm> = {}): ObjetivoEstrategicoForm {
  return {
    nombre: 'Incrementar la rentabilidad',
    descripcion: '',
    responsable: 'Ana Torres',
    perspectivaId: 1,
    relacionesDestinoIds: [],
    ...overrides,
  };
}

describe('objetivoEstrategicoFormValidaciones', () => {
  it.each(['', '   '])('requires a non-empty name', (nombre) => {
    expect(validarObjetivoForm(makeForm({ nombre })).nombre).toBe('El nombre es obligatorio.');
  });

  it('rejects names longer than 200 characters', () => {
    expect(validarObjetivoForm(makeForm({ nombre: 'a'.repeat(201) })).nombre).toBe(
      'Máximo 200 caracteres.',
    );
  });

  it.each(['', '   '])('requires a non-empty owner', (responsable) => {
    expect(validarObjetivoForm(makeForm({ responsable })).responsable).toBe(
      'El responsable es obligatorio.',
    );
  });

  it('rejects owners longer than 200 characters', () => {
    expect(validarObjetivoForm(makeForm({ responsable: 'a'.repeat(201) })).responsable).toBe(
      'Máximo 200 caracteres.',
    );
  });

  it('requires a perspective', () => {
    expect(validarObjetivoForm(makeForm({ perspectivaId: null })).perspectivaId).toBe(
      'Selecciona una perspectiva.',
    );
  });

  it('returns no errors for a valid form', () => {
    expect(validarObjetivoForm(makeForm())).toEqual({});
  });
});
