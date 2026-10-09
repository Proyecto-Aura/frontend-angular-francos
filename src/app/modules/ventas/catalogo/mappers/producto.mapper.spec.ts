import { formDesdeProducto } from '../interfaces/producto.interface';
import {
  CATEGORIAS_DTO,
  PRESENTACIONES_DTO,
  catalogoDto,
  makeFilaDto,
  makeFormValido,
  makePresentacion,
  makeProducto,
} from '../testing/catalogo.fixtures';
import {
  etiquetaPresentacion,
  toActualizarProductoPresentacionRequest,
  toActualizarProductoRequest,
  toActualizarPromocionRequest,
  toCrearProductoPresentacionRequest,
  toCrearProductoRequest,
  toCrearPromocionRequest,
  toOpcionCategoria,
  toOpcionPresentacion,
  toProductos,
} from './producto.mapper';

describe('producto.mapper', () => {
  describe('opciones de los selectores', () => {
    it('builds the presentation label from quantity and unit', () => {
      expect(etiquetaPresentacion(100, 'gr')).toBe('100 gr');
      expect(toOpcionPresentacion(PRESENTACIONES_DTO[4])).toEqual({
        id: 5,
        nombre: '1 kg',
        activa: true,
      });
      expect(toOpcionPresentacion(PRESENTACIONES_DTO[6]).activa).toBe(false);
    });

    it('maps a category keeping its active flag', () => {
      expect(toOpcionCategoria(CATEGORIAS_DTO[4])).toEqual({
        id: 5,
        nombre: 'Temporada',
        activa: false,
      });
    });
  });

  describe('toProductos', () => {
    it('groups the rows of the same product and keeps the API order', () => {
      const productos = toProductos(catalogoDto());

      expect(productos.map((p) => p.nombre)).toEqual([
        'Chifles clásicos',
        'Chifles picantes',
        'Camote frito',
        'Camote salado',
        'Canchita serrana',
        'Maní crocante',
        'Habas tostadas',
      ]);
      expect(productos[0].presentaciones.map((p) => p.sku)).toEqual(['FR-P1-PR1', 'FR-P1-PR2']);
      expect(productos.flatMap((p) => p.presentaciones)).toHaveLength(9);
    });

    it('maps every field of a presentation', () => {
      const [producto] = toProductos(catalogoDto());

      expect(producto).toMatchObject({
        id: 1,
        categoriaId: 1,
        categoria: 'Chifles',
        destacado: true,
      });
      expect(producto.presentaciones[0]).toEqual({
        id: 1,
        productoPresentacionId: 11,
        nombre: '100 gr',
        sku: 'FR-P1-PR1',
        slug: 'chifles-clásicos-100-gr-p1',
        precioUnit: 5.5,
        precioMayor: 4.2,
        umbral: 24,
        promo: { id: 91, pct: 10, ini: '2026-09-01', fin: '2026-09-30' },
        imagen: 'https://cdn.test/chifles-100.jpg',
        visible: false,
        estado: 'Activo',
        stock: 480,
      });
    });

    it('uses safe defaults for missing wholesale price, image, slug and stock record', () => {
      const [producto] = toProductos([
        {
          ...makeFilaDto({
            id: 1,
            productoId: 1,
            nombre: 'X',
            categoriaId: 1,
            categoria: 'Chifles',
            presentacionId: 1,
            cantidad: 1,
            unidad: 'kg',
            precio: 5,
            mayorista: null,
            umbral: null,
          }),
          slug: null,
          producto_terminado: null,
          estado: false,
        },
      ]);

      expect(producto.presentaciones[0]).toMatchObject({
        precioMayor: 0,
        umbral: 0,
        imagen: '',
        slug: '',
        stock: 0,
        estado: 'Inactivo',
        promo: null,
      });
    });
  });

  describe('formulario -> peticiones', () => {
    it('builds the create request with numbers, trimmed text and nested presentations', () => {
      const form = makeFormValido({ nombre: '  Chifles BBQ ', destacado: true });
      form.presentaciones[0].imagen = ' https://cdn.test/a.jpg ';

      expect(toCrearProductoRequest(form)).toEqual({
        categoria_id: 1,
        nombre: 'Chifles BBQ',
        descripcion: 'Sabor BBQ.',
        destacado: true,
        producto_presentaciones: [
          {
            presentacion_id: 1,
            precio_unitario: 6,
            precio_mayorista: 5,
            umbral_mayorista: 12,
            imagen_url: 'https://cdn.test/a.jpg',
          },
        ],
      });
    });

    it('omits the image when there is none', () => {
      const request = toCrearProductoRequest(makeFormValido());

      expect(request.producto_presentaciones[0]).not.toHaveProperty('imagen_url');
    });

    it('builds the product update request', () => {
      expect(toActualizarProductoRequest(makeFormValido({ destacado: true }))).toEqual({
        categoria_id: 1,
        nombre: 'Chifles BBQ',
        descripcion: 'Sabor BBQ.',
        destacado: true,
      });
    });

    it('builds the request to add a presentation to an existing product', () => {
      expect(toCrearProductoPresentacionRequest(5, makeFormValido().presentaciones[0])).toEqual({
        producto_id: 5,
        presentacion_id: 1,
        precio_unitario: 6,
        precio_mayorista: 5,
        umbral_mayorista: 12,
      });
    });

    it('builds the presentation update without SKU, slug or presentation id', () => {
      const form = formDesdeProducto(makeProducto());

      expect(toActualizarProductoPresentacionRequest(form.presentaciones[0])).toEqual({
        precio_unitario: 5.5,
        precio_mayorista: 4.2,
        umbral_mayorista: 24,
        imagen_url: null,
      });
    });

    it('builds the promotion requests from the form', () => {
      const presentacion = {
        ...makeFormValido().presentaciones[0],
        promoPct: '25',
        promoIni: '2026-10-01',
        promoFin: '2026-10-31',
      };

      expect(toCrearPromocionRequest(81, presentacion)).toEqual({
        producto_presentacion_id: 81,
        valor: 25,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-10-31',
      });
      expect(toActualizarPromocionRequest(presentacion)).toEqual({
        valor: 25,
        fecha_inicio: '2026-10-01',
        fecha_fin: '2026-10-31',
      });
    });

    it('loads an existing product into form strings keeping the API ids', () => {
      const form = formDesdeProducto(
        makeProducto({
          presentaciones: [
            makePresentacion({
              promo: { id: 91, pct: 10, ini: '2026-09-01', fin: '2026-09-30' },
              imagen: 'https://cdn.test/a.jpg',
            }),
          ],
        }),
      );

      expect(form.categoriaId).toBe('1');
      expect(form.presentaciones[0]).toMatchObject({
        productoPresentacionId: 11,
        sku: 'FR-P1-PR1',
        presentacionId: '1',
        precioUnit: '5.5',
        precioMayor: '4.2',
        umbral: '24',
        imagen: 'https://cdn.test/a.jpg',
        promoId: 91,
        promoActiva: true,
        promoPct: '10',
        promoIni: '2026-09-01',
        promoFin: '2026-09-30',
      });
    });
  });
});
