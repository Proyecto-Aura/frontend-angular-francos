import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { StockMinimoPanel } from './stock-minimo-panel';

const PRODUCTO_PRESENTACIONES = `${environment.apiUrl}/producto-presentaciones`;
const PRODUCTOS_TERMINADOS = `${environment.apiUrl}/productos-terminados`;
const INSUMOS = `${environment.apiUrl}/insumos`;

const producto = (id: number, nombre: string, actual: number, minimo: number) => ({
  id,
  sku: `FR-${id}`,
  estado: true,
  producto: { nombre },
  presentacion: { cantidad: 500, unidad_medida: 'gr' },
  producto_terminado: { stock_actual: actual, stock_minimo: minimo, stock_maximo: null },
});
const pagina = <T>(data: T[], extra = {}) => ({
  data,
  meta: { total: data.length, page: 1, limit: 10, total_pages: 1, ...extra },
});

describe('StockMinimoPanel', () => {
  let fixture: ComponentFixture<StockMinimoPanel>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const productos = () =>
    http.match((r) => r.url === PRODUCTO_PRESENTACIONES && r.method === 'GET');
  const insumos = () => http.match((r) => r.url === INSUMOS && r.method === 'GET');
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    );
  const filasDeTabla = () => el.querySelectorAll('app-ds-data-table tbody tr').length;

  /** Crea el panel y responde la primera carga (productos terminados). */
  function crear(datos = [producto(1, 'Chifles', 40, 10), producto(2, 'Yuca', 3, 10)]) {
    fixture = TestBed.createComponent(StockMinimoPanel);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    productos()[0].flush(pagina(datos));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StockMinimoPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('empieza con los productos terminados, 10 por página', () => {
    fixture = TestBed.createComponent(StockMinimoPanel);
    fixture.detectChanges();

    const [pedido] = productos();
    expect(pedido.request.params.get('page')).toBe('1');
    expect(pedido.request.params.get('limit')).toBe('10');
    pedido.flush(pagina([]));
  });

  it('lista nombre, presentación, stock actual, mínimo, máximo y nivel', () => {
    crear();

    const texto = el.querySelector('app-ds-data-table')?.textContent ?? '';
    expect(texto).toContain('Chifles');
    expect(texto).toContain('FR-1 · 500 gr');
    expect(texto).toContain('40');
    expect(texto).toContain('Normal');
    expect(texto).toContain('Bajo');
    expect(texto).toContain('Sin máximo');
    expect(texto).toContain('40 und');
    expect(filasDeTabla()).toBe(2);
  });

  it('un producto sin stock se marca como agotado', () => {
    crear([producto(3, 'Plátano', 0, 5)]);

    expect(el.textContent).toContain('Agotado');
  });

  it('la pestaña Insumos recarga desde /insumos con unidades y sin filtros previos', () => {
    crear();
    const pestana = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((t) =>
      t.textContent?.includes('Insumos'),
    )!;

    pestana.click();
    insumos()[0].flush(
      pagina([
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
      ]),
    );
    fixture.detectChanges();

    const tabla = el.querySelector('app-ds-data-table')?.textContent ?? '';
    expect(tabla).toContain('Harina');
    expect(tabla).toContain('FR-INS-003 · Materia prima');
    expect(tabla).toContain('20 kg');
    expect(tabla).toContain('500 kg');
    expect(el.textContent).toContain('1 insumo');
    expect(el.textContent).toContain('el mínimo y el máximo son obligatorios');
  });

  it('filtrar por nivel vuelve a pedir la primera página con ese nivel', () => {
    crear();
    const select = el.querySelector<HTMLSelectElement>('app-ds-filter-bar select')!;

    select.value = 'bajo';
    select.dispatchEvent(new Event('change'));
    const [pedido] = productos();
    expect(pedido.request.params.get('nivel')).toBe('bajo');
    expect(pedido.request.params.get('page')).toBe('1');
    pedido.flush(pagina([producto(2, 'Yuca', 3, 10)]));
    fixture.detectChanges();

    expect(filasDeTabla()).toBe(1);
  });

  it('buscar vuelve a pedir la primera página con el texto', () => {
    crear();
    const input = el.querySelector<HTMLInputElement>('app-ds-filter-bar input')!;

    input.value = 'yuca';
    input.dispatchEvent(new Event('input'));
    const [pedido] = productos();
    expect(pedido.request.params.get('search')).toBe('yuca');
    expect(pedido.request.params.get('page')).toBe('1');
    pedido.flush(pagina([producto(2, 'Yuca', 3, 10)]));
    fixture.detectChanges();

    expect(filasDeTabla()).toBe(1);
  });

  it('sin resultados muestra el estado vacío', () => {
    crear([]);

    expect(el.textContent).toContain('Sin resultados');
  });

  it('si falla la carga ofrece reintentar', () => {
    fixture = TestBed.createComponent(StockMinimoPanel);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    productos()[0].flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('caído');

    boton('Reintentar')!.click();
    productos()[0].flush(pagina([producto(1, 'Chifles', 40, 10)]));
    fixture.detectChanges();

    expect(el.textContent).toContain('Chifles');
  });

  it('editar el stock mínimo guarda, avisa y recarga la lista', () => {
    crear();

    el.querySelector<HTMLButtonElement>(
      '[aria-label="Editar stock de alerta de Chifles"]',
    )!.click();
    fixture.detectChanges();
    const valor = el.querySelector<HTMLInputElement>('input#sm-minimo')!;
    valor.value = '15';
    valor.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    boton('Guardar cambios')!.click();

    const req = http.expectOne({ method: 'PATCH', url: `${PRODUCTOS_TERMINADOS}/1` });
    expect(req.request.body).toEqual({ stock_minimo: 15 });
    req.flush({});
    productos()[0].flush(pagina([producto(1, 'Chifles', 40, 15)]));
    fixture.detectChanges();

    expect(el.textContent).toContain('Stock de alerta de Chifles actualizado');
  });
});
