import { ObjetivoEstrategicoTiForm } from '../../interfaces/objetivo-estrategico-ti.interface';
import { validarObjetivoTiForm } from './objetivo-estrategico-ti-form.validaciones';

function makeForm(overrides: Partial<ObjetivoEstrategicoTiForm> = {}): ObjetivoEstrategicoTiForm {
  return {
    nombre: 'Modernizar la infraestructura',
    descripcion: '',
    responsable: 'Ana Torres',
    perspectivaId: 1,
    relacionesDestinoIds: [],
    oeNegocioId: 100,
    ...overrides,
  };
}

describe('objetivoEstrategicoTiFormValidaciones', () => {
  it.each(['', '   '])('requires a non-empty name', (nombre) => {
    expect(validarObjetivoTiForm(makeForm({ nombre })).nombre).toBe('El nombre es obligatorio.');
  });

  it('rejects names longer than 200 characters', () => {
    expect(validarObjetivoTiForm(makeForm({ nombre: 'a'.repeat(201) })).nombre).toBe(
      'Máximo 200 caracteres.',
    );
  });

  it.each(['', '   '])('requires a non-empty owner', (responsable) => {
    expect(validarObjetivoTiForm(makeForm({ responsable })).responsable).toBe(
      'El responsable es obligatorio.',
    );
  });

  it('rejects owners longer than 200 characters', () => {
    expect(validarObjetivoTiForm(makeForm({ responsable: 'a'.repeat(201) })).responsable).toBe(
      'Máximo 200 caracteres.',
    );
  });

  it('requires a perspective', () => {
    expect(validarObjetivoTiForm(makeForm({ perspectivaId: null })).perspectivaId).toBe(
      'Selecciona una perspectiva.',
    );
  });

  it('requires a linked business objective', () => {
    expect(validarObjetivoTiForm(makeForm({ oeNegocioId: null })).oeNegocioId).toBe(
      'Selecciona un objetivo de negocio.',
    );
  });

  it('returns no errors for a valid form', () => {
    expect(validarObjetivoTiForm(makeForm())).toEqual({});
  });

  it('returns multiple validation errors together', () => {
    expect(
      validarObjetivoTiForm(
        makeForm({ nombre: ' ', responsable: '', perspectivaId: null, oeNegocioId: null }),
      ),
    ).toEqual({
      nombre: 'El nombre es obligatorio.',
      responsable: 'El responsable es obligatorio.',
      perspectivaId: 'Selecciona una perspectiva.',
      oeNegocioId: 'Selecciona un objetivo de negocio.',
    });
  });
});
