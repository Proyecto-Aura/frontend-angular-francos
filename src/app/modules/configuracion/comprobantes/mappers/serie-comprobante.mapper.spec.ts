import { SerieForm, serieFormDe } from '../interfaces/serie-comprobante.interface';
import { makeSerieDto } from '../testing/serie-fixtures';
import {
  toActualizarSerieRequest,
  toCrearSerieRequest,
  toSerieComprobante,
} from './serie-comprobante.mapper';

describe('serie-comprobante.mapper', () => {
  describe('toSerieComprobante', () => {
    it('convierte los campos del backend', () => {
      expect(toSerieComprobante(makeSerieDto())).toEqual({
        id: 1,
        tipo: 'factura',
        codigo: 'F001',
        inicio: 1,
        fin: 99_999_999,
        ultimoEmitido: 1847,
        siguiente: 1848,
        restantes: 99_998_152,
        activa: true,
      });
    });

    it('una serie sin emitir no tiene último emitido', () => {
      const serie = toSerieComprobante(makeSerieDto({ correlativo_actual: null }));

      expect(serie.ultimoEmitido).toBeNull();
    });

    it('una serie desactivada queda inactiva', () => {
      expect(toSerieComprobante(makeSerieDto({ estado: false })).activa).toBe(false);
    });
  });

  describe('toCrearSerieRequest', () => {
    it('envía números, la serie en mayúsculas y el estado', () => {
      const form: SerieForm = {
        tipo: 'boleta',
        serie: ' b002 ',
        inicio: '1',
        fin: '2000',
        activa: false,
      };

      expect(toCrearSerieRequest(form)).toEqual({
        tipo: 'boleta',
        serie: 'B002',
        correlativo_inicio: 1,
        correlativo_fin: 2000,
        estado: false,
      });
    });
  });

  describe('toActualizarSerieRequest', () => {
    const original = toSerieComprobante(makeSerieDto({ correlativo_fin: 5000 }));

    it('no envía nada si no cambió nada', () => {
      expect(toActualizarSerieRequest(original, serieFormDe(original))).toEqual({});
    });

    it('envía solo el campo que cambió', () => {
      const form = { ...serieFormDe(original), fin: '9000' };

      expect(toActualizarSerieRequest(original, form)).toEqual({ correlativo_fin: 9000 });
    });

    it('la serie en minúsculas no cuenta como cambio', () => {
      const form = { ...serieFormDe(original), serie: 'f001' };

      expect(toActualizarSerieRequest(original, form)).toEqual({});
    });

    it('envía el código nuevo en mayúsculas', () => {
      const form = { ...serieFormDe(original), serie: 'f009' };

      expect(toActualizarSerieRequest(original, form)).toEqual({ serie: 'F009' });
    });

    it('no envía el estado: se cambia con activar y desactivar', () => {
      const form = { ...serieFormDe(original), activa: false };

      expect(toActualizarSerieRequest(original, form)).toEqual({});
    });
  });
});
