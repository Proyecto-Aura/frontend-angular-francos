import { SolicitudProduccionForm } from '../../interfaces/solicitud-produccion.interface';
import { validarSolicitudProduccionForm } from './solicitud-produccion-form.validaciones';

function makeForm(overrides: Partial<SolicitudProduccionForm> = {}): SolicitudProduccionForm {
  return {
    fechaLimite: '2026-09-15',
    filas: [{ id: 1, productoTerminadoId: '256', cantidadSolicitada: '10' }],
    ...overrides,
  };
}

describe('validarSolicitudProduccionForm', () => {
  it('returns no errors for a valid form', () => {
    expect(validarSolicitudProduccionForm(makeForm())).toEqual({});
  });

  it('requires fechaLimite', () => {
    expect(validarSolicitudProduccionForm(makeForm({ fechaLimite: '' }))).toMatchObject({
      fechaLimite: 'Requerido.',
    });
  });

  it('requires at least one fila', () => {
    expect(validarSolicitudProduccionForm(makeForm({ filas: [] }))).toEqual({
      filas: 'Agrega al menos un producto.',
    });
  });

  it('requires productoTerminadoId and cantidadSolicitada on every fila, keyed by fila id', () => {
    const resultado = validarSolicitudProduccionForm(
      makeForm({ filas: [{ id: 5, productoTerminadoId: '', cantidadSolicitada: '' }] }),
    );

    expect(resultado.porFila).toEqual({
      5: {
        productoTerminadoId: 'Selecciona un producto.',
        cantidadSolicitada: 'Debe ser mayor a 0.',
      },
    });
  });

  it('rejects a cantidadSolicitada of 0 or negative', () => {
    const resultado = validarSolicitudProduccionForm(
      makeForm({ filas: [{ id: 1, productoTerminadoId: '256', cantidadSolicitada: '0' }] }),
    );

    expect(resultado.porFila).toEqual({ 1: { cantidadSolicitada: 'Debe ser mayor a 0.' } });
  });

  it('rejects repeating the same producto across filas', () => {
    const resultado = validarSolicitudProduccionForm(
      makeForm({
        filas: [
          { id: 1, productoTerminadoId: '256', cantidadSolicitada: '10' },
          { id: 2, productoTerminadoId: '256', cantidadSolicitada: '5' },
        ],
      }),
    );

    expect(resultado.filas).toBe('No puedes repetir el mismo producto en dos filas.');
  });

  it('allows the same producto to repeat as long as the id differs (sanity: only exact dupes trigger)', () => {
    const resultado = validarSolicitudProduccionForm(
      makeForm({
        filas: [
          { id: 1, productoTerminadoId: '256', cantidadSolicitada: '10' },
          { id: 2, productoTerminadoId: '257', cantidadSolicitada: '5' },
        ],
      }),
    );

    expect(resultado.filas).toBeUndefined();
  });
});
