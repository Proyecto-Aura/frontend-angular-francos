import { LoteProductoTerminadoForm } from '../../interfaces/lote-producto-terminado.interface';
import { validarLoteForm } from './lote-form.validaciones';

function makeForm(overrides: Partial<LoteProductoTerminadoForm> = {}): LoteProductoTerminadoForm {
  return {
    productoTerminadoId: '12',
    codigoLote: 'FR-LT-001-261101-PT12',
    fechaProduccion: '2026-11-01',
    fechaVencimiento: '2026-12-01',
    cantidadInicial: '50',
    ...overrides,
  };
}

describe('validarLoteForm (Produccion)', () => {
  it('no reporta errores con un formulario valido', () => {
    expect(validarLoteForm(makeForm())).toEqual({});
  });

  it('exige seleccionar un producto', () => {
    expect(validarLoteForm(makeForm({ productoTerminadoId: '' }))).toEqual({
      productoTerminadoId: 'Selecciona un producto.',
    });
  });

  it('fecha de vencimiento es opcional', () => {
    expect(validarLoteForm(makeForm({ fechaVencimiento: '' }))).toEqual({});
  });

  it('rechaza fecha de vencimiento anterior a la de produccion', () => {
    expect(
      validarLoteForm(makeForm({ fechaProduccion: '2026-11-01', fechaVencimiento: '2026-10-01' })),
    ).toEqual({
      fechaVencimiento: 'Debe ser igual o posterior a la fecha de producción.',
    });
  });

  it('exige cantidad inicial', () => {
    expect(validarLoteForm(makeForm({ cantidadInicial: '' }))).toEqual({
      cantidadInicial: 'Requerido.',
    });
  });

  it('rechaza cantidad inicial no numerica o con mas de 2 decimales', () => {
    expect(validarLoteForm(makeForm({ cantidadInicial: 'abc' }))).toEqual({
      cantidadInicial: 'Debe ser un número válido (hasta 2 decimales).',
    });
    expect(validarLoteForm(makeForm({ cantidadInicial: '10.123' }))).toEqual({
      cantidadInicial: 'Debe ser un número válido (hasta 2 decimales).',
    });
  });

  it('acepta cantidad inicial con hasta 2 decimales', () => {
    expect(validarLoteForm(makeForm({ cantidadInicial: '10.5' }))).toEqual({});
  });
});
