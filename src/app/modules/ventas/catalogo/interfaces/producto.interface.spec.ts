import {
  FilaCatalogo,
  ProductoFormModel,
  aFilas,
  disponibilidadDe,
  fechaCorta,
  money,
  nf,
  presentacionVacia,
  productoFormVacio,
  skuDe,
  validarProducto,
} from './producto.interface';
import { makeFormValido, makePresentacion, makeProducto } from '../testing/catalogo.fixtures';

function conPresentacion(cambios: Partial<ProductoFormModel['presentaciones'][number]>) {
  const form = makeFormValido();
  form.presentaciones[0] = { ...form.presentaciones[0], ...cambios };
  return form;
}

describe('producto.interface', () => {
  describe('skuDe', () => {
    it('builds the SKU from product and presentation ids', () => {
      expect(skuDe(3, 2)).toBe('FR-P3-PR2');
    });
  });

  describe('disponibilidadDe', () => {
    const f = (stock: number, umbral: number): Pick<FilaCatalogo, 'stock' | 'umbral'> => ({
      stock,
      umbral,
    });

    it('is agotado when there is no stock', () => {
      expect(disponibilidadDe(f(0, 10))).toBe('agotado');
    });

    it('is bajo when stock is under the wholesale threshold', () => {
      expect(disponibilidadDe(f(5, 10))).toBe('bajo');
    });

    it('is disponible when stock reaches the threshold', () => {
      expect(disponibilidadDe(f(10, 10))).toBe('disponible');
    });
  });

  describe('aFilas', () => {
    it('creates one row per presentation with its API data', () => {
      const filas = aFilas([
        makeProducto({
          presentaciones: [
            makePresentacion(),
            makePresentacion({ id: 2, productoPresentacionId: 12, sku: 'FR-P1-PR2' }),
          ],
        }),
      ]);

      expect(filas.map((x) => x.sku)).toEqual(['FR-P1-PR1', 'FR-P1-PR2']);
      expect(filas[1]).toMatchObject({
        productoId: 1,
        presentacionId: 2,
        productoPresentacionId: 12,
        nombre: 'Chifles clásicos',
        categoria: 'Chifles',
        slug: 'chifles-clasicos-100-gr-p1',
      });
    });
  });

  describe('formatters', () => {
    it('formats money in soles with two decimals', () => {
      expect(money(5.5)).toContain('5.50');
      expect(money(5.5).startsWith('S/ ')).toBe(true);
    });

    it('formats numbers with the local separators', () => {
      expect(nf(1234)).toBe(Number(1234).toLocaleString('es-PE'));
    });

    it('formats short dates like the design', () => {
      expect(fechaCorta('2026-09-30')).toBe('30 Sep 2026');
    });

    it('returns the input when the date is not an ISO date', () => {
      expect(fechaCorta('pronto')).toBe('pronto');
    });
  });

  describe('formulario', () => {
    it('starts with one empty presentation and the given category', () => {
      const form = productoFormVacio('3');

      expect(form).toEqual({
        nombre: '',
        categoriaId: '3',
        descripcion: '',
        destacado: false,
        presentaciones: [presentacionVacia()],
      });
      expect(form.presentaciones[0].productoPresentacionId).toBeNull();
    });
  });

  describe('validarProducto', () => {
    it('accepts a valid product', () => {
      expect(validarProducto(makeFormValido())).toEqual([]);
    });

    it('lists every missing field of an empty form', () => {
      expect(validarProducto(productoFormVacio(''))).toEqual([
        'nombre del producto',
        'categoría',
        'descripción',
        'nombre de la presentación (presentación 1)',
        'precio unitario mayor a 0 (máx. 2 decimales) (presentación 1)',
        'precio mayorista mayor a 0 (máx. 2 decimales) (presentación 1)',
        'umbral mayorista entero mayor a 0 (presentación 1)',
      ]);
    });

    it('requires at least one presentation', () => {
      expect(validarProducto(makeFormValido({ presentaciones: [] }))).toContain(
        'al menos una presentación',
      );
    });

    it('rejects a wholesale price equal to or above the unit price', () => {
      expect(validarProducto(conPresentacion({ precioMayor: '6' }))).toContain(
        'el precio mayorista debe ser menor que el unitario (presentación 1)',
      );
      expect(validarProducto(conPresentacion({ precioMayor: '7' }))).toContain(
        'el precio mayorista debe ser menor que el unitario (presentación 1)',
      );
    });

    it.each(['0', '-3', 'abc', '5.555'])('rejects %s as unit price', (valor) => {
      expect(validarProducto(conPresentacion({ precioUnit: valor }))).toContain(
        'precio unitario mayor a 0 (máx. 2 decimales) (presentación 1)',
      );
    });

    it.each(['0', '1.5', 'x'])('rejects %s as wholesale threshold', (valor) => {
      expect(validarProducto(conPresentacion({ umbral: valor }))).toContain(
        'umbral mayorista entero mayor a 0 (presentación 1)',
      );
    });

    it('rejects a presentation repeated in the same product', () => {
      const form = makeFormValido();
      form.presentaciones.push({ ...form.presentaciones[0] });

      expect(validarProducto(form)).toEqual([
        'la presentación ya está en el producto (presentación 2)',
      ]);
    });

    it('validates the image as an http(s) URL only when provided', () => {
      expect(validarProducto(conPresentacion({ imagen: 'https://cdn.test/a.jpg' }))).toEqual([]);
      expect(validarProducto(conPresentacion({ imagen: '' }))).toEqual([]);
      expect(validarProducto(conPresentacion({ imagen: 'foto.jpg' }))).toContain(
        'la imagen debe ser una URL válida (http o https) (presentación 1)',
      );
      expect(validarProducto(conPresentacion({ imagen: 'javascript:alert(1)' }))).toContain(
        'la imagen debe ser una URL válida (http o https) (presentación 1)',
      );
    });

    it('reports the position of the failing presentation', () => {
      const form = makeFormValido();
      form.presentaciones.push({ ...presentacionVacia(), presentacionId: '2' });

      const errores = validarProducto(form);

      expect(errores.every((e) => e.includes('(presentación 2)'))).toBe(true);
      expect(errores).toHaveLength(3);
    });

    it('validates an active promotion percentage and dates', () => {
      const base = {
        promoActiva: true,
        promoPct: '10',
        promoIni: '2026-10-01',
        promoFin: '2026-10-31',
      };

      expect(validarProducto(conPresentacion(base))).toEqual([]);
      expect(validarProducto(conPresentacion({ ...base, promoPct: '0' }))).toContain(
        'porcentaje de promoción entre 1 y 99 (presentación 1)',
      );
      expect(validarProducto(conPresentacion({ ...base, promoPct: '100' }))).toContain(
        'porcentaje de promoción entre 1 y 99 (presentación 1)',
      );
      expect(validarProducto(conPresentacion({ ...base, promoIni: '' }))).toContain(
        'fechas de la promoción (presentación 1)',
      );
    });

    it('rejects a promotion that ends before it starts and allows a one-day promotion', () => {
      const base = { promoActiva: true, promoPct: '10' };

      expect(
        validarProducto(
          conPresentacion({ ...base, promoIni: '2026-10-10', promoFin: '2026-10-09' }),
        ),
      ).toContain('la fecha de fin debe ser posterior al inicio (presentación 1)');
      expect(
        validarProducto(
          conPresentacion({ ...base, promoIni: '2026-10-10', promoFin: '2026-10-10' }),
        ),
      ).toEqual([]);
    });

    it('ignores the promotion fields when the promotion is off', () => {
      expect(validarProducto(conPresentacion({ promoActiva: false, promoPct: '999' }))).toEqual([]);
    });
  });
});
