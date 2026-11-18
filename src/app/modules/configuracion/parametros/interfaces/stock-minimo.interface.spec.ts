import {
  ItemStockMinimo,
  formatearCantidad,
  formatearStock,
  nivelDe,
  parsearNumero,
  validarParametrosStock,
} from './stock-minimo.interface';

const ITEM: ItemStockMinimo = {
  tipo: 'insumos',
  id: 1,
  sku: 'FR-INS-001',
  nombre: 'Harina de trigo',
  detalle: 'Materia prima',
  unidad: 'kg',
  stockActual: 20,
  stockMinimo: 10,
  stockMaximo: 500,
  activo: true,
};

describe('stock-minimo.interface', () => {
  describe('nivelDe', () => {
    it('agotado cuando no hay stock', () => {
      expect(nivelDe({ ...ITEM, stockActual: 0 })).toBe('agotado');
    });

    it('bajo cuando el stock está por debajo del mínimo', () => {
      expect(nivelDe({ ...ITEM, stockActual: 9.5 })).toBe('bajo');
    });

    it('normal en el mínimo o por encima, sin llegar al 90% del máximo', () => {
      expect(nivelDe({ ...ITEM, stockActual: 10 })).toBe('normal');
      expect(nivelDe(ITEM)).toBe('normal');
      expect(nivelDe({ ...ITEM, stockActual: 450 })).toBe('normal');
    });

    it('alto solo con más del 90% del máximo', () => {
      expect(nivelDe({ ...ITEM, stockActual: 451 })).toBe('alto');
    });

    it('sin máximo nunca es alto', () => {
      expect(nivelDe({ ...ITEM, stockMaximo: null, stockActual: 9999 })).toBe('normal');
    });
  });

  describe('parsearNumero', () => {
    it('acepta enteros, decimales y coma', () => {
      expect(parsearNumero('0')).toBe(0);
      expect(parsearNumero(' 12.5 ')).toBe(12.5);
      expect(parsearNumero('12,5')).toBe(12.5);
    });

    it('rechaza vacío, negativos, texto y más de 2 decimales', () => {
      for (const invalido of ['', '-1', 'abc', '1.234', '1,2,3']) {
        expect(parsearNumero(invalido)).toBeNull();
      }
    });
  });

  describe('validarParametrosStock', () => {
    it('exige el mínimo', () => {
      expect(validarParametrosStock('  ', '', false).minimo).toBe('Ingresar el stock mínimo');
    });

    it('rechaza mínimo y máximo con formato inválido', () => {
      const errores = validarParametrosStock('-3', '1.234', false);
      expect(errores.minimo).toContain('Número mayor o igual a 0');
      expect(errores.maximo).toContain('Número mayor o igual a 0');
    });

    it('el máximo es obligatorio solo cuando se pide', () => {
      expect(validarParametrosStock('5', '', true).maximo).toBe('Ingresar el stock máximo');
      expect(validarParametrosStock('5', '', false)).toEqual({});
    });

    it('el máximo debe ser mayor a 0', () => {
      expect(validarParametrosStock('0', '0', false).maximo).toBe(
        'El stock máximo debe ser mayor a 0',
      );
      expect(validarParametrosStock('0', '0.5', false)).toEqual({});
    });

    it('el máximo no puede ser menor al mínimo', () => {
      expect(validarParametrosStock('10', '9', false).maximo).toBe(
        'El stock máximo debe ser mayor o igual que el stock mínimo',
      );
      expect(validarParametrosStock('10', '10', false)).toEqual({});
    });
  });

  it('formatea cantidades con hasta 2 decimales y su unidad', () => {
    expect(formatearStock(12.5)).toBe('12.5');
    expect(formatearCantidad(3, 'kg')).toBe('3 kg');
  });
});
