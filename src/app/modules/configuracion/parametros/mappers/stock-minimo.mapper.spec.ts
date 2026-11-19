import {
  InsumoStockDto,
  ProductoPresentacionStockDto,
} from '../interfaces/stock-minimo-dto.interface';
import { toItemInsumo, toItemProducto, toPaginaStockMinimo } from './stock-minimo.mapper';

const PRODUCTO: ProductoPresentacionStockDto = {
  id: 7,
  sku: 'FR-CHI-500',
  estado: true,
  producto: { nombre: 'Chifles' },
  presentacion: { cantidad: 500, unidad_medida: 'gr' },
  producto_terminado: { stock_actual: 40, stock_minimo: 10, stock_maximo: null },
};

const INSUMO: InsumoStockDto = {
  id: 3,
  sku: 'FR-INS-003',
  nombre: 'Harina',
  unidad_medida: 'unidad',
  tipo: 'empaque',
  stock_actual: 20,
  stock_minimo: 10,
  stock_maximo: 500,
  estado: false,
};

describe('stock-minimo.mapper', () => {
  it('toItemProducto usa el producto_presentacion_id, la presentación y "und"', () => {
    expect(toItemProducto(PRODUCTO)).toEqual({
      tipo: 'productos',
      id: 7,
      sku: 'FR-CHI-500',
      nombre: 'Chifles',
      detalle: '500 gr',
      unidad: 'und',
      stockActual: 40,
      stockMinimo: 10,
      stockMaximo: null,
      activo: true,
    });
  });

  it('toItemProducto tolera una presentación sin registro de stock', () => {
    expect(toItemProducto({ ...PRODUCTO, producto_terminado: null })).toMatchObject({
      stockActual: 0,
      stockMinimo: 0,
      stockMaximo: null,
    });
  });

  it('toItemInsumo traduce tipo y unidad y conserva el tope y el estado', () => {
    expect(toItemInsumo(INSUMO)).toEqual({
      tipo: 'insumos',
      id: 3,
      sku: 'FR-INS-003',
      nombre: 'Harina',
      detalle: 'Empaque',
      unidad: 'und',
      stockActual: 20,
      stockMinimo: 10,
      stockMaximo: 500,
      activo: false,
    });
  });

  it('convierte decimales que llegan como texto', () => {
    const item = toItemInsumo({
      ...INSUMO,
      stock_actual: '20.50' as unknown as number,
      stock_minimo: '10.00' as unknown as number,
    });

    expect(item.stockActual).toBe(20.5);
    expect(item.stockMinimo).toBe(10);
  });

  it('toPaginaStockMinimo convierte los datos y copia la paginación', () => {
    const pagina = toPaginaStockMinimo(
      { data: [INSUMO], meta: { total: 11, page: 2, limit: 10, total_pages: 2 } },
      toItemInsumo,
    );

    expect(pagina.items.map((i) => i.nombre)).toEqual(['Harina']);
    expect(pagina).toMatchObject({ total: 11, pagina: 2, totalPaginas: 2 });
  });
});
