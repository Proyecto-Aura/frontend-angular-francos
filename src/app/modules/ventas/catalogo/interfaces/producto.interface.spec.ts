import {
  Producto,
  aFilas,
  disponibilidadDe,
  fechaCorta,
  formDesdeProducto,
  money,
  pesoImagen,
  presentacionDesdeForm,
  presentacionVacia,
  productoFormVacio,
  skuDe,
  slugDe,
  validarProducto,
} from './producto.interface';

function makeProducto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 1,
    nombre: 'Chifles clásicos',
    categoria: 'Chifles',
    descripcion: 'Plátano bellaco en hojuelas.',
    destacado: true,
    presentaciones: [
      {
        id: 1,
        nombre: 'Bolsa 100 g',
        precioUnit: 5.5,
        precioMayor: 4.2,
        umbral: 24,
        promo: { pct: 10, ini: '2026-09-01', fin: '2026-09-30' },
        imagen: 'chifles-100.jpg',
        visible: false,
        estado: 'Activo',
        stock: 480,
      },
      {
        id: 2,
        nombre: 'Bolsa 200 g',
        precioUnit: 9.9,
        precioMayor: 7.9,
        umbral: 12,
        promo: null,
        imagen: 'chifles-200.jpg',
        visible: false,
        estado: 'Activo',
        stock: 0,
      },
    ],
    ...overrides,
  };
}

function makeFormValido() {
  const form = productoFormVacio('Chifles');
  form.nombre = 'Chifles BBQ';
  form.descripcion = 'Sabor BBQ.';
  form.presentaciones = [
    {
      ...presentacionVacia(),
      nombre: 'Bolsa 100 g',
      precioUnit: '6',
      precioMayor: '5',
      umbral: '12',
    },
  ];
  return form;
}

describe('producto.interface', () => {
  describe('skuDe', () => {
    it('builds the SKU from product and presentation ids', () => {
      expect(skuDe(3, 2)).toBe('FR-P3-PR2');
    });
  });

  describe('disponibilidadDe', () => {
    it('is agotado when there is no stock', () => {
      expect(disponibilidadDe({ stock: 0, umbral: 10 })).toBe('agotado');
    });

    it('is bajo when stock is under the wholesale threshold', () => {
      expect(disponibilidadDe({ stock: 9, umbral: 10 })).toBe('bajo');
    });

    it('is disponible when stock reaches the threshold', () => {
      expect(disponibilidadDe({ stock: 10, umbral: 10 })).toBe('disponible');
    });
  });

  describe('aFilas', () => {
    it('creates one row per presentation with its SKU', () => {
      const filas = aFilas([makeProducto()]);

      expect(filas).toHaveLength(2);
      expect(filas.map((f) => f.sku)).toEqual(['FR-P1-PR1', 'FR-P1-PR2']);
      expect(filas[0].nombre).toBe('Chifles clásicos');
      expect(filas[0].presentacion).toBe('Bolsa 100 g');
      expect(filas[0].promo?.pct).toBe(10);
    });
  });

  describe('formatters', () => {
    it('formats money in soles with two decimals', () => {
      expect(money(5.5)).toContain('S/');
      expect(money(5.5)).toContain('5.50');
    });

    it('formats short dates like the design', () => {
      expect(fechaCorta('2026-09-30')).toBe('30 Sep 2026');
      expect(fechaCorta('2026-01-05')).toBe('05 Ene 2026');
    });

    it('returns the input when the date is not an ISO date', () => {
      expect(fechaCorta('sin fecha')).toBe('sin fecha');
    });

    it('builds an accent-free slug from product and presentation', () => {
      expect(slugDe('Chifles clásicos', 'Bolsa 100 g')).toBe('chifles-clasicos-bolsa-100-g');
    });

    it('derives a simulated image weight from the file name', () => {
      expect(pesoImagen('a.jpg')).toBe('325 KB');
    });
  });

  describe('formulario', () => {
    it('starts with one empty presentation and the given category', () => {
      const form = productoFormVacio('Camote');

      expect(form.categoria).toBe('Camote');
      expect(form.presentaciones).toHaveLength(1);
      expect(form.presentaciones[0].id).toBeNull();
      expect(form.presentaciones[0].estado).toBe('Activo');
      expect(form.presentaciones[0].visible).toBe(false);
    });

    it('loads an existing product into form strings', () => {
      const form = formDesdeProducto(makeProducto());

      expect(form.presentaciones[0].precioUnit).toBe('5.5');
      expect(form.presentaciones[0].promoActiva).toBe(true);
      expect(form.presentaciones[0].promoPct).toBe('10');
      expect(form.presentaciones[1].promoActiva).toBe(false);
      expect(form.presentaciones[1].promoPct).toBe('');
    });

    it('converts form strings back to numbers keeping the presentation id', () => {
      const [pr] = formDesdeProducto(makeProducto()).presentaciones;

      const result = presentacionDesdeForm(pr, 99);

      expect(result.id).toBe(1);
      expect(result.precioUnit).toBe(5.5);
      expect(result.promo).toEqual({ pct: 10, ini: '2026-09-01', fin: '2026-09-30' });
    });

    it('uses the fallback id for new presentations and drops an inactive promotion', () => {
      const result = presentacionDesdeForm({ ...presentacionVacia(), nombre: 'Pack x6' }, 3);

      expect(result.id).toBe(3);
      expect(result.promo).toBeNull();
    });
  });

  describe('validarProducto', () => {
    it('accepts a valid product', () => {
      expect(validarProducto(makeFormValido())).toEqual([]);
    });

    it('lists every missing field of an empty form', () => {
      expect(validarProducto(productoFormVacio('Chifles'))).toEqual([
        'nombre del producto',
        'descripción',
        'nombre de la presentación (presentación 1)',
        'precio unitario mayor a 0 (presentación 1)',
        'precio mayorista mayor a 0 (presentación 1)',
        'umbral mayorista mayor a 0 (presentación 1)',
      ]);
    });

    it('requires at least one presentation', () => {
      const form = { ...makeFormValido(), presentaciones: [] };

      expect(validarProducto(form)).toContain('al menos una presentación');
    });

    it('rejects a wholesale price above the unit price', () => {
      const form = makeFormValido();
      form.presentaciones[0].precioMayor = '7';

      expect(validarProducto(form)).toEqual([
        'el precio mayorista no puede superar el unitario (presentación 1)',
      ]);
    });

    it('reports the position of the failing presentation', () => {
      const form = makeFormValido();
      form.presentaciones.push({ ...presentacionVacia(), nombre: 'Pack x6' });

      expect(validarProducto(form)).toContain('precio unitario mayor a 0 (presentación 2)');
    });

    it('validates an active promotion percentage and dates', () => {
      const form = makeFormValido();
      form.presentaciones[0] = {
        ...form.presentaciones[0],
        promoActiva: true,
        promoPct: '100',
        promoIni: '',
        promoFin: '',
      };

      expect(validarProducto(form)).toEqual([
        'porcentaje de promoción entre 1 y 99 (presentación 1)',
        'fechas de la promoción (presentación 1)',
      ]);
    });

    it('rejects a promotion that ends before it starts', () => {
      const form = makeFormValido();
      form.presentaciones[0] = {
        ...form.presentaciones[0],
        promoActiva: true,
        promoPct: '10',
        promoIni: '2026-10-10',
        promoFin: '2026-10-01',
      };

      expect(validarProducto(form)).toEqual([
        'la fecha de fin debe ser posterior al inicio (presentación 1)',
      ]);
    });
  });
});
