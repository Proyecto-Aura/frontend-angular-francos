import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ItemStockMinimo } from '../interfaces/stock-minimo.interface';
import { StockMinimoService } from './stock-minimo.service';

const PRODUCTO_PRESENTACIONES = `${environment.apiUrl}/producto-presentaciones`;
const PRODUCTOS_TERMINADOS = `${environment.apiUrl}/productos-terminados`;
const INSUMOS = `${environment.apiUrl}/insumos`;

const META = { total: 1, page: 1, limit: 10, total_pages: 1 };

const ITEM_PRODUCTO: ItemStockMinimo = {
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
};

describe('StockMinimoService', () => {
  let service: StockMinimoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StockMinimoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar("productos") pide las presentaciones con página, límite y búsqueda', () => {
    let nombres: string[] = [];
    service
      .listar('productos', 2, ' chifles ', 'bajo')
      .subscribe((p) => (nombres = p.items.map((i) => i.nombre)));

    const req = http.expectOne((r) => r.url === PRODUCTO_PRESENTACIONES);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('search')).toBe('chifles');
    expect(req.request.params.get('nivel')).toBe('bajo');
    req.flush({
      data: [
        {
          id: 7,
          sku: 'FR-CHI-500',
          estado: true,
          producto: { nombre: 'Chifles' },
          presentacion: { cantidad: 500, unidad_medida: 'gr' },
          producto_terminado: { stock_actual: 40, stock_minimo: 10, stock_maximo: null },
        },
      ],
      meta: META,
    });

    expect(nombres).toEqual(['Chifles']);
  });

  it('listar("insumos") pide los insumos y no manda search si no hay búsqueda', () => {
    let nombres: string[] = [];
    service.listar('insumos').subscribe((p) => (nombres = p.items.map((i) => i.nombre)));

    const req = http.expectOne((r) => r.url === INSUMOS);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('nivel')).toBe(false);
    req.flush({
      data: [
        {
          id: 3,
          sku: 'FR-INS-003',
          nombre: 'Harina',
          unidad_medida: 'kg',
          tipo: 'materia_prima',
          stock_actual: 20,
          stock_minimo: 10,
          stock_maximo: 500,
          estado: true,
        },
      ],
      meta: META,
    });

    expect(nombres).toEqual(['Harina']);
  });

  it('actualizar() de un producto sin tope no manda stock_maximo si sigue sin tope', () => {
    let terminado = false;
    service.actualizar(ITEM_PRODUCTO, 15, null).subscribe(() => (terminado = true));

    const req = http.expectOne({ method: 'PATCH', url: `${PRODUCTOS_TERMINADOS}/7` });
    expect(req.request.body).toEqual({ stock_minimo: 15 });
    req.flush({ id: 99 });

    expect(terminado).toBe(true);
  });

  it('actualizar() de un producto con tope puede quitarlo enviando null', () => {
    service.actualizar({ ...ITEM_PRODUCTO, stockMaximo: 100 }, 15, null).subscribe();

    const req = http.expectOne({ method: 'PATCH', url: `${PRODUCTOS_TERMINADOS}/7` });
    expect(req.request.body).toEqual({ stock_minimo: 15, stock_maximo: null });
    req.flush({});
  });

  it('actualizar() de un insumo envía mínimo y máximo a /insumos/:id', () => {
    service
      .actualizar({ ...ITEM_PRODUCTO, tipo: 'insumos', id: 3, stockMaximo: 500 }, 2.5, 600)
      .subscribe();

    const req = http.expectOne({ method: 'PATCH', url: `${INSUMOS}/3` });
    expect(req.request.body).toEqual({ stock_minimo: 2.5, stock_maximo: 600 });
    req.flush({});
  });
});
