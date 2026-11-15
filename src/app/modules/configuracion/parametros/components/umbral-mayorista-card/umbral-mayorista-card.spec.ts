import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { EdicionUmbral } from '../../interfaces/parametros-ventas.interface';
import { UmbralMayoristaCard } from './umbral-mayorista-card';

const PRESENTACIONES = `${environment.apiUrl}/producto-presentaciones`;

const presentacion = (id: number, nombre: string, umbral: number | null) => ({
  id,
  sku: `FR-${id}`,
  precio_mayorista: 4.2,
  umbral_mayorista: umbral,
  producto: { nombre },
  presentacion: { cantidad: 250, unidad_medida: 'gr' },
});

const pagina = (data: unknown[], extra = {}) => ({
  data,
  meta: { total: data.length, page: 1, limit: 10, total_pages: 1, ...extra },
});

describe('UmbralMayoristaCard', () => {
  let fixture: ComponentFixture<UmbralMayoristaCard>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const listado = () => http.expectOne((r) => r.url === PRESENTACIONES);
  const escribir = (input: HTMLInputElement, valor: string) => {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  /** Crea la tarjeta con los datos dados y responde la carga inicial. */
  function crear(
    entradas: Record<string, unknown> = {},
    filas = [presentacion(7, 'Chifles salados', 12), presentacion(8, 'Mix andino', null)],
  ) {
    fixture = TestBed.createComponent(UmbralMayoristaCard);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('umbral', '24');
    fixture.componentRef.setInput('porProducto', true);
    Object.entries(entradas).forEach(([nombre, valor]) =>
      fixture.componentRef.setInput(nombre, valor),
    );
    fixture.detectChanges();

    listado().flush(pagina(filas));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UmbralMayoristaCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('con el umbral por producto activo lista las presentaciones con precio mayorista', () => {
    crear();

    const texto = el.textContent ?? '';
    expect(texto).toContain('Chifles salados');
    expect(texto).toContain('FR-7 · 250 gr');
    expect(el.querySelector<HTMLInputElement>('input[name="umbral-7"]')!.value).toBe('12');
    expect(el.querySelector<HTMLInputElement>('input[name="umbral-8"]')!.value).toBe('');
  });

  it('con el umbral por producto apagado no muestra la tabla y explica que rige el global', () => {
    crear({ porProducto: false });

    const texto = el.textContent ?? '';
    expect(texto).toContain('Todas las presentaciones usan el umbral global');
    expect(el.querySelector('app-ds-data-table')).toBeNull();
  });

  it('explica el umbral con "más de N", igual que el cálculo del cobro', () => {
    crear({ umbral: '30' });

    expect(el.textContent).toContain('más de 30 unidades');
  });

  it('emite el umbral global que se escribe', () => {
    crear();
    const emitidos: string[] = [];
    fixture.componentInstance.umbralChange.subscribe((v) => emitidos.push(v));

    escribir(el.querySelector<HTMLInputElement>('input#umbral-global')!, '36');

    expect(emitidos).toEqual(['36']);
  });

  it('muestra el error del umbral global', () => {
    crear({ errorUmbral: 'Entre 2 y 10,000 unidades' });

    expect(el.textContent).toContain('Entre 2 y 10,000 unidades');
  });

  it('emite el cambio del switch de umbral por producto', () => {
    crear();
    const emitidos: boolean[] = [];
    fixture.componentRef.instance.porProductoChange.subscribe((v) => emitidos.push(v));

    el.querySelector<HTMLInputElement>('app-ds-switch input')!.click();

    expect(emitidos).toEqual([false]);
  });

  it('emite la edición de un umbral propio con su valor original', () => {
    crear();
    const emitidas: EdicionUmbral[] = [];
    fixture.componentInstance.edicionChange.subscribe((e) => emitidas.push(e));

    escribir(el.querySelector<HTMLInputElement>('input[name="umbral-7"]')!, '18');

    expect(emitidas).toEqual([{ id: 7, original: 12, valor: '18' }]);
  });

  it('muestra el valor editado que llega por `ediciones` y lo marca como propio', () => {
    crear({ ediciones: new Map([[8, { id: 8, original: null, valor: '30' }]]) });

    expect(el.querySelector<HTMLInputElement>('input[name="umbral-8"]')!.value).toBe('30');
    expect(el.textContent).toContain('Umbral propio');
  });

  it('marca en la fila un umbral propio fuera de rango', () => {
    crear({ ediciones: new Map([[8, { id: 8, original: null, valor: '1' }]]) });

    expect(el.textContent).toContain('Entre 2 y 10,000 unidades');
  });

  it('busca por texto y vuelve a la primera página', () => {
    crear();
    const buscador = el.querySelector<HTMLInputElement>('input[placeholder^="Buscar"]')!;

    escribir(buscador, 'mix');

    const pedido = listado();
    expect(pedido.request.params.get('search')).toBe('mix');
    expect(pedido.request.params.get('page')).toBe('1');
    pedido.flush(pagina([presentacion(8, 'Mix andino', null)]));
  });

  it('vuelve a cargar la tabla cuando la página sube `recarga`', () => {
    crear();

    fixture.componentRef.setInput('recarga', 1);
    fixture.detectChanges();

    listado().flush(pagina([presentacion(7, 'Chifles salados', 18)]));
    fixture.detectChanges();
    expect(el.querySelector<HTMLInputElement>('input[name="umbral-7"]')!.value).toBe('18');
  });

  it('si falla la carga ofrece reintentar', () => {
    fixture = TestBed.createComponent(UmbralMayoristaCard);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('porProducto', true);
    fixture.detectChanges();
    listado().flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('boom');
    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    listado().flush(pagina([]));
  });
});
