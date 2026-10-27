import { MovimientoProductoTerminadoForm } from '../../interfaces/movimiento-producto-terminado.interface';
import { validarMovimientoProductoTerminadoForm } from './movimiento-producto-terminado.validaciones';

function makeForm(
  overrides: Partial<MovimientoProductoTerminadoForm> = {},
): MovimientoProductoTerminadoForm {
  return {
    tipoMovimiento: 'salida',
    motivoGeneral: 'Despacho a cliente',
    filas: [{ id: 1, productoTerminadoId: '256', loteId: '', cantidad: '10' }],
    ...overrides,
  };
}

describe('validarMovimientoProductoTerminadoForm', () => {
  it('returns no errors for a valid salida form (sin lote)', () => {
    expect(validarMovimientoProductoTerminadoForm(makeForm())).toEqual({});
  });

  it('returns no errors for a valid entrada form (con lote)', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'entrada',
        filas: [{ id: 1, productoTerminadoId: '256', loteId: '5', cantidad: '10' }],
      }),
    );

    expect(resultado).toEqual({});
  });

  it('requires motivoGeneral', () => {
    expect(validarMovimientoProductoTerminadoForm(makeForm({ motivoGeneral: '  ' }))).toMatchObject(
      {
        motivoGeneral: 'Requerido.',
      },
    );
  });

  it('requires at least one fila', () => {
    expect(validarMovimientoProductoTerminadoForm(makeForm({ filas: [] }))).toEqual({
      filas: 'Agrega al menos un producto.',
    });
  });

  it('does not require loteId on salida', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({ filas: [{ id: 1, productoTerminadoId: '256', loteId: '', cantidad: '10' }] }),
    );

    expect(resultado.porFila).toBeUndefined();
  });

  it('requires loteId on entrada', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'entrada',
        filas: [{ id: 1, productoTerminadoId: '256', loteId: '', cantidad: '10' }],
      }),
    );

    expect(resultado.porFila).toEqual({ 1: { loteId: 'Selecciona un lote.' } });
  });

  it('requires productoTerminadoId and cantidad on every fila, keyed by fila id', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({ filas: [{ id: 5, productoTerminadoId: '', loteId: '', cantidad: '' }] }),
    );

    expect(resultado.porFila).toEqual({
      5: { productoTerminadoId: 'Selecciona un producto.', cantidad: 'Debe ser mayor a 0.' },
    });
  });

  it('rejects a cantidad of 0 or negative', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({ filas: [{ id: 1, productoTerminadoId: '256', loteId: '', cantidad: '0' }] }),
    );

    expect(resultado.porFila).toEqual({ 1: { cantidad: 'Debe ser mayor a 0.' } });
  });

  it('on salida, rejects repeating the same producto across filas', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        filas: [
          { id: 1, productoTerminadoId: '256', loteId: '', cantidad: '10' },
          { id: 2, productoTerminadoId: '256', loteId: '', cantidad: '5' },
        ],
      }),
    );

    expect(resultado.filas).toBe('No puedes repetir el mismo producto en dos filas.');
  });

  it('on salida, allows the same producto to repeat as long as the id differs (sanity: only exact dupes trigger)', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        filas: [
          { id: 1, productoTerminadoId: '256', loteId: '', cantidad: '10' },
          { id: 2, productoTerminadoId: '257', loteId: '', cantidad: '5' },
        ],
      }),
    );

    expect(resultado.filas).toBeUndefined();
  });

  it('on entrada, rejects repeating the same lote across filas even with different productos', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'entrada',
        filas: [
          { id: 1, productoTerminadoId: '256', loteId: '5', cantidad: '10' },
          { id: 2, productoTerminadoId: '257', loteId: '5', cantidad: '3' },
        ],
      }),
    );

    expect(resultado.filas).toBe('No puedes repetir el mismo lote en dos filas.');
  });

  it('on entrada, allows repeating the producto as long as the lote differs', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'entrada',
        filas: [
          { id: 1, productoTerminadoId: '256', loteId: '5', cantidad: '10' },
          { id: 2, productoTerminadoId: '256', loteId: '6', cantidad: '3' },
        ],
      }),
    );

    expect(resultado.filas).toBeUndefined();
  });

  it('returns no errors for a valid ajuste form (con lote, cantidad en 0)', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'ajuste',
        filas: [{ id: 1, productoTerminadoId: '256', loteId: '5', cantidad: '0' }],
      }),
    );

    expect(resultado).toEqual({});
  });

  it('requires loteId on ajuste, igual que en entrada', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'ajuste',
        filas: [{ id: 1, productoTerminadoId: '256', loteId: '', cantidad: '10' }],
      }),
    );

    expect(resultado.porFila).toEqual({ 1: { loteId: 'Selecciona un lote.' } });
  });

  it('on ajuste, rejects a negative cantidad but allows 0 (lote agotado es un conteo valido)', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'ajuste',
        filas: [{ id: 1, productoTerminadoId: '256', loteId: '5', cantidad: '-1' }],
      }),
    );

    expect(resultado.porFila).toEqual({ 1: { cantidad: 'No puede ser negativa.' } });
  });

  it('on ajuste, requires a cantidad (cantidad real contada, no un delta)', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'ajuste',
        filas: [{ id: 1, productoTerminadoId: '256', loteId: '5', cantidad: '' }],
      }),
    );

    expect(resultado.porFila).toEqual({ 1: { cantidad: 'Ingresa la cantidad real.' } });
  });

  it('on ajuste, rejects repeating the same lote across filas', () => {
    const resultado = validarMovimientoProductoTerminadoForm(
      makeForm({
        tipoMovimiento: 'ajuste',
        filas: [
          { id: 1, productoTerminadoId: '256', loteId: '5', cantidad: '10' },
          { id: 2, productoTerminadoId: '257', loteId: '5', cantidad: '3' },
        ],
      }),
    );

    expect(resultado.filas).toBe('No puedes repetir el mismo lote en dos filas.');
  });
});
