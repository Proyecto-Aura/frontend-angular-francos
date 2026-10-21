import { MovimientoInsumoForm } from '../../interfaces/movimiento-insumo.interface';
import { validarMovimientoForm } from './movimiento-form.validaciones';

function makeForm(overrides: Partial<MovimientoInsumoForm> = {}): MovimientoInsumoForm {
  return {
    tipoMovimiento: 'salida',
    motivoGeneral: 'Compra a proveedor',
    filas: [{ id: 1, insumoId: '9', loteId: '', cantidad: '10' }],
    ...overrides,
  };
}

describe('validarMovimientoForm', () => {
  it('returns no errors for a valid salida form (sin lote)', () => {
    expect(validarMovimientoForm(makeForm())).toEqual({});
  });

  it('returns no errors for a valid entrada form (con lote)', () => {
    const resultado = validarMovimientoForm(
      makeForm({
        tipoMovimiento: 'entrada',
        filas: [{ id: 1, insumoId: '9', loteId: '5', cantidad: '10' }],
      }),
    );

    expect(resultado).toEqual({});
  });

  it('requires motivoGeneral', () => {
    expect(validarMovimientoForm(makeForm({ motivoGeneral: '  ' }))).toMatchObject({
      motivoGeneral: 'Requerido.',
    });
  });

  it('requires at least one fila', () => {
    expect(validarMovimientoForm(makeForm({ filas: [] }))).toEqual({
      filas: 'Agrega al menos un insumo.',
    });
  });

  it('does not require loteId on salida', () => {
    const resultado = validarMovimientoForm(
      makeForm({ filas: [{ id: 1, insumoId: '9', loteId: '', cantidad: '10' }] }),
    );

    expect(resultado.porFila).toBeUndefined();
  });

  it('requires loteId on entrada', () => {
    const resultado = validarMovimientoForm(
      makeForm({
        tipoMovimiento: 'entrada',
        filas: [{ id: 1, insumoId: '9', loteId: '', cantidad: '10' }],
      }),
    );

    expect(resultado.porFila).toEqual({ 1: { loteId: 'Selecciona un lote.' } });
  });

  it('requires insumoId and cantidad on every fila, keyed by fila id', () => {
    const resultado = validarMovimientoForm(
      makeForm({ filas: [{ id: 5, insumoId: '', loteId: '', cantidad: '' }] }),
    );

    expect(resultado.porFila).toEqual({
      5: { insumoId: 'Selecciona un insumo.', cantidad: 'Debe ser mayor a 0.' },
    });
  });

  it('rejects a cantidad of 0 or negative', () => {
    const resultado = validarMovimientoForm(
      makeForm({ filas: [{ id: 1, insumoId: '9', loteId: '', cantidad: '0' }] }),
    );

    expect(resultado.porFila).toEqual({ 1: { cantidad: 'Debe ser mayor a 0.' } });
  });

  it('on salida, rejects repeating the same insumo across filas', () => {
    const resultado = validarMovimientoForm(
      makeForm({
        filas: [
          { id: 1, insumoId: '9', loteId: '', cantidad: '10' },
          { id: 2, insumoId: '9', loteId: '', cantidad: '5' },
        ],
      }),
    );

    expect(resultado.filas).toBe('No puedes repetir el mismo insumo en dos filas.');
  });

  it('on salida, allows the same insumo to repeat as long as the id differs (sanity: only exact dupes trigger)', () => {
    const resultado = validarMovimientoForm(
      makeForm({
        filas: [
          { id: 1, insumoId: '9', loteId: '', cantidad: '10' },
          { id: 2, insumoId: '10', loteId: '', cantidad: '5' },
        ],
      }),
    );

    expect(resultado.filas).toBeUndefined();
  });

  it('on entrada, rejects repeating the same lote across filas even with different insumos', () => {
    const resultado = validarMovimientoForm(
      makeForm({
        tipoMovimiento: 'entrada',
        filas: [
          { id: 1, insumoId: '9', loteId: '5', cantidad: '10' },
          { id: 2, insumoId: '11', loteId: '5', cantidad: '3' },
        ],
      }),
    );

    expect(resultado.filas).toBe('No puedes repetir el mismo lote en dos filas.');
  });

  it('on entrada, allows repeating the insumo as long as the lote differs', () => {
    const resultado = validarMovimientoForm(
      makeForm({
        tipoMovimiento: 'entrada',
        filas: [
          { id: 1, insumoId: '9', loteId: '5', cantidad: '10' },
          { id: 2, insumoId: '9', loteId: '6', cantidad: '3' },
        ],
      }),
    );

    expect(resultado.filas).toBeUndefined();
  });
});
