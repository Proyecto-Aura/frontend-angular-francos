import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../../../../../environments/environment';
import { ItemStockMinimo } from '../../interfaces/stock-minimo.interface';
import { StockMinimoModal } from './stock-minimo-modal';

const INSUMOS = `${environment.apiUrl}/insumos`;
const PRODUCTOS_TERMINADOS = `${environment.apiUrl}/productos-terminados`;

const INSUMO: ItemStockMinimo = {
  tipo: 'insumos',
  id: 3,
  sku: 'FR-INS-003',
  nombre: 'Harina',
  detalle: 'Materia prima',
  unidad: 'kg',
  stockActual: 20,
  stockMinimo: 10,
  stockMaximo: 500,
  activo: true,
};
const PRODUCTO: ItemStockMinimo = {
  ...INSUMO,
  tipo: 'productos',
  id: 7,
  sku: 'FR-CHI-500',
  nombre: 'Chifles',
  detalle: '500 gr',
  unidad: 'und',
  stockMaximo: null,
};

describe('StockMinimoModal', () => {
  let fixture: ComponentFixture<StockMinimoModal>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let guardados: ItemStockMinimo[];
  let cierres: number;

  const abrir = (item: ItemStockMinimo) => {
    fixture.componentRef.setInput('item', item);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  };
  const escribir = (id: 'sm-minimo' | 'sm-maximo', valor: string) => {
    const input = el.querySelector<HTMLInputElement>(`input#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StockMinimoModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StockMinimoModal);
    el = fixture.nativeElement as HTMLElement;
    guardados = [];
    cierres = 0;
    fixture.componentInstance.saved.subscribe((i) => guardados.push(i));
    fixture.componentInstance.closed.subscribe(() => cierres++);
  });

  afterEach(() => http.verify());

  it('muestra el ítem, precarga mínimo y máximo y el stock actual con su unidad', () => {
    abrir(INSUMO);

    expect(el.textContent).toContain('Editar stock de alerta');
    expect(el.textContent).toContain('Harina · FR-INS-003');
    expect(el.textContent).toContain('20 kg');
    expect(el.querySelector<HTMLInputElement>('input#sm-minimo')?.value).toBe('10');
    expect(el.querySelector<HTMLInputElement>('input#sm-maximo')?.value).toBe('500');
  });

  it('un producto sin tope deja el máximo vacío y opcional', () => {
    abrir(PRODUCTO);

    expect(el.querySelector<HTMLInputElement>('input#sm-maximo')?.value).toBe('');
    expect(el.textContent).toContain('Opcional');
  });

  it('la vista previa recalcula el nivel con los valores escritos', () => {
    abrir(INSUMO);
    expect(el.textContent).toContain('Normal');

    escribir('sm-minimo', '30');
    expect(el.textContent).toContain('Bajo');

    escribir('sm-minimo', '10');
    escribir('sm-maximo', '21');
    expect(el.textContent).toContain('Alto');
  });

  it('no guarda un mínimo vacío o inválido', () => {
    abrir(INSUMO);
    escribir('sm-minimo', '');

    boton('Guardar cambios').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Ingresar el stock mínimo');
    http.expectNone(`${INSUMOS}/3`);

    escribir('sm-minimo', '-3');
    expect(el.textContent).toContain('Número mayor o igual a 0');
  });

  it('en insumos el máximo es obligatorio y no puede ser menor al mínimo', () => {
    abrir(INSUMO);
    escribir('sm-maximo', '');
    boton('Guardar cambios').click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Ingresar el stock máximo');

    escribir('sm-maximo', '5');
    expect(el.textContent).toContain('El stock máximo debe ser mayor o igual que el stock mínimo');
    http.expectNone(`${INSUMOS}/3`);
  });

  it('guarda mínimo y máximo de un insumo, avisa al padre y cierra', () => {
    abrir(INSUMO);
    escribir('sm-minimo', '12,5');
    escribir('sm-maximo', '600');

    boton('Guardar cambios').click();
    const req = http.expectOne({ method: 'PATCH', url: `${INSUMOS}/3` });
    expect(req.request.body).toEqual({ stock_minimo: 12.5, stock_maximo: 600 });
    req.flush({});

    expect(guardados).toEqual([INSUMO]);
    expect(cierres).toBe(1);
  });

  it('guarda solo el mínimo de un producto sin tope en /productos-terminados', () => {
    abrir(PRODUCTO);
    escribir('sm-minimo', '25');

    boton('Guardar cambios').click();
    const req = http.expectOne({ method: 'PATCH', url: `${PRODUCTOS_TERMINADOS}/7` });
    expect(req.request.body).toEqual({ stock_minimo: 25 });
    req.flush({});

    expect(cierres).toBe(1);
  });

  it('si el backend rechaza el valor muestra el mensaje y no cierra', () => {
    abrir(INSUMO);
    escribir('sm-minimo', '20');

    boton('Guardar cambios').click();
    http
      .expectOne({ method: 'PATCH', url: `${INSUMOS}/3` })
      .flush(
        { message: 'El stock máximo debe ser mayor o igual que el stock mínimo' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'El stock máximo debe ser mayor o igual que el stock mínimo',
    );
    expect(guardados).toEqual([]);
    expect(cierres).toBe(0);
  });
});
