import { LoteInsumoForm } from '../../interfaces/lote-insumo.interface';
import { validarLoteForm } from './lote-form.validaciones';

function makeLoteForm(overrides: Partial<LoteInsumoForm> = {}): LoteInsumoForm {
  return {
    insumoId: '9',
    codigoLote: 'FR-LT-006-261017-INS9',
    fechaIngreso: '2026-10-17',
    fechaVencimiento: '2026-12-01',
    cantidadInicial: '250',
    ...overrides,
  };
}

describe('validarLoteForm', () => {
  it('requires fechaVencimiento by default', () => {
    const errores = validarLoteForm(makeLoteForm({ fechaVencimiento: '' }));

    expect(errores.fechaVencimiento).toBe('Requerido.');
  });

  it('does not require fechaVencimiento when the insumo does not need it (tipo empaque)', () => {
    const errores = validarLoteForm(makeLoteForm({ fechaVencimiento: '' }), false);

    expect(errores.fechaVencimiento).toBeUndefined();
  });

  it('still validates fechaVencimiento >= fechaIngreso even when not required, if one was given anyway', () => {
    const errores = validarLoteForm(
      makeLoteForm({ fechaIngreso: '2026-10-17', fechaVencimiento: '2000-01-01' }),
      false,
    );

    expect(errores.fechaVencimiento).toBe('Debe ser igual o posterior a la fecha de ingreso.');
  });

  it('requires insumoId regardless of requiereFechaVencimiento', () => {
    const errores = validarLoteForm(makeLoteForm({ insumoId: '', fechaVencimiento: '' }), false);

    expect(errores.insumoId).toBe('Selecciona un insumo.');
  });
});
