import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { GestionarParametrosVentas } from './parametros-ventas';

const PARAMETROS = `${environment.apiUrl}/parametros-ventas`;
const PRESENTACIONES = `${environment.apiUrl}/producto-presentaciones`;
const PROMOCIONES = `${environment.apiUrl}/promociones`;

const PARAMETROS_DTO = {
  umbral_mayorista_global: 24,
  umbral_por_producto: true,
  promociones_activas: true,
  culqi_activo: true,
  efectivo_activo: true,
  updated_at: '2026-11-14T10:00:00Z',
};

const presentacion = (id: number, nombre: string, umbral: number | null) => ({
  id,
  sku: `FR-${id}`,
  precio_mayorista: 4.2,
  umbral_mayorista: umbral,
  producto: { nombre },
  presentacion: { cantidad: 250, unidad_medida: 'gr' },
});

const promocion = (id: number, nombre: string, vigente: boolean) => ({
  id,
  nombre,
  tipo: 'porcentaje',
  fecha_inicio: '2026-10-15',
  fecha_fin: '2026-12-15',
  estado: true,
  vigente,
});

const pagina = <T>(data: T[]) => ({
  data,
  meta: { total: data.length, page: 1, limit: 10, total_pages: 1 },
});

describe('GestionarParametrosVentas', () => {
  let fixture: ComponentFixture<GestionarParametrosVentas>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const lecturaParametros = () => http.expectOne((r) => r.url === PARAMETROS && r.method === 'GET');
  const patchParametros = () => http.expectOne((r) => r.url === PARAMETROS && r.method === 'PATCH');
  const listadoPresentaciones = () =>
    http.expectOne((r) => r.url === PRESENTACIONES && r.method === 'GET');

  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;
  const interruptor = (etiqueta: string) =>
    Array.from(el.querySelectorAll<HTMLLabelElement>('app-ds-switch label'))
      .find((l) => l.textContent?.includes(etiqueta))!
      .querySelector<HTMLInputElement>('input')!;
  const pago = (nombre: string) =>
    el.querySelector<HTMLInputElement>(`app-ds-switch[aria-label="${nombre}"] input`)!;
  const umbralGlobal = () => el.querySelector<HTMLInputElement>('input#umbral-global')!;
  const umbralPropio = (id: number) =>
    el.querySelector<HTMLInputElement>(`input[name="umbral-${id}"]`)!;

  const escribir = (input: HTMLInputElement, valor: string) => {
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  /** Crea la página y responde las tres cargas: parámetros, presentaciones y promociones. */
  function crear(parametros = PARAMETROS_DTO) {
    fixture = TestBed.createComponent(GestionarParametrosVentas);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    lecturaParametros().flush(parametros);
    fixture.detectChanges();

    listadoPresentaciones().flush(
      pagina([presentacion(7, 'Chifles salados', 12), presentacion(8, 'Mix andino', null)]),
    );
    http
      .expectOne((r) => r.url === PROMOCIONES)
      .flush(pagina([promocion(1, '-15% en mix', true), promocion(2, '2x1 en chifles', false)]));
    fixture.detectChanges();
  }

  /** Después de guardar: la página vuelve a leer los parámetros y recarga la tabla. */
  function responderRelectura(parametros = PARAMETROS_DTO) {
    lecturaParametros().flush(parametros);
    fixture.detectChanges();
    listadoPresentaciones().flush(
      pagina([presentacion(7, 'Chifles salados', 12), presentacion(8, 'Mix andino', null)]),
    );
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GestionarParametrosVentas],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga los parámetros, las presentaciones con mayorista y las promociones', () => {
    fixture = TestBed.createComponent(GestionarParametrosVentas);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    lecturaParametros().flush(PARAMETROS_DTO);
    fixture.detectChanges();

    const pedido = listadoPresentaciones();
    expect(pedido.request.params.get('con_mayorista')).toBe('true');
    expect(pedido.request.params.get('limit')).toBe('10');
    pedido.flush(pagina([presentacion(7, 'Chifles salados', 12)]));
    http.expectOne((r) => r.url === PROMOCIONES).flush(pagina([]));
    fixture.detectChanges();

    expect(el.textContent).toContain('Gestionar parámetros de ventas');
    expect(umbralGlobal().value).toBe('24');
    expect(el.textContent).toContain('Chifles salados');
  });

  it('muestra el umbral propio y cuáles presentaciones usan el global', () => {
    crear();

    expect(umbralPropio(7).value).toBe('12');
    expect(umbralPropio(8).value).toBe('');
    expect(umbralPropio(8).placeholder).toBe('24');
    const texto = el.textContent ?? '';
    expect(texto).toContain('Umbral propio');
    expect(texto).toContain('Umbral global');
  });

  it('muestra las promociones con su estado y los métodos de pago', () => {
    crear();

    const texto = el.textContent ?? '';
    expect(texto).toContain('-15% en mix');
    expect(texto).toContain('15 Oct 2026 – 15 Dic 2026');
    expect(texto).toContain('Vigente');
    expect(texto).toContain('Fuera de fechas');
    expect(texto).toContain('Culqi');
    expect(texto).toContain('Efectivo');
  });

  it('empieza sin cambios: Guardar y Descartar deshabilitados', () => {
    crear();

    expect(boton('Guardar cambios').disabled).toBe(true);
    expect(boton('Descartar').disabled).toBe(true);
  });

  it('guarda solo el umbral global cuando es lo único que cambió (RF-A193)', () => {
    crear();
    escribir(umbralGlobal(), '36');
    expect(boton('Guardar cambios').disabled).toBe(false);

    boton('Guardar cambios').click();
    const patch = patchParametros();
    expect(patch.request.body).toEqual({ umbral_mayorista_global: 36 });
    patch.flush({ ...PARAMETROS_DTO, umbral_mayorista_global: 36 });
    responderRelectura({ ...PARAMETROS_DTO, umbral_mayorista_global: 36 });

    expect(el.textContent).toContain('Parámetros de ventas guardados');
    expect(umbralGlobal().value).toBe('36');
    expect(boton('Guardar cambios').disabled).toBe(true);
  });

  it('rechaza un umbral fuera de rango sin llamar al backend', () => {
    crear();
    escribir(umbralGlobal(), '1');

    boton('Guardar cambios').click();
    fixture.detectChanges();

    http.expectNone((r) => r.method === 'PATCH');
    expect(el.textContent).toContain('Entre 2 y 10,000 unidades');
  });

  it('exige el umbral global', () => {
    crear();
    escribir(umbralGlobal(), '');

    boton('Guardar cambios').click();
    fixture.detectChanges();

    http.expectNone((r) => r.method === 'PATCH');
    expect(el.textContent).toContain('Ingresa el umbral');
  });

  it('apaga las promociones y lo manda al guardar (RF-A194)', () => {
    crear();
    interruptor('Promociones activas').click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Pausada');

    boton('Guardar cambios').click();
    const patch = patchParametros();
    expect(patch.request.body).toEqual({ promociones_activas: false });
    patch.flush({ ...PARAMETROS_DTO, promociones_activas: false });
    responderRelectura({ ...PARAMETROS_DTO, promociones_activas: false });
  });

  it('apaga un método de pago pero no deja el portal sin ninguno (RF-A195)', () => {
    crear();
    pago('Pago con Culqi').click();
    pago('Pago en efectivo').click();
    fixture.detectChanges();

    boton('Guardar cambios').click();
    fixture.detectChanges();

    http.expectNone((r) => r.method === 'PATCH');
    expect(el.textContent).toContain('Debe quedar al menos un método de pago activo');
  });

  it('guarda el cambio de un método de pago si queda el otro activo', () => {
    crear();
    pago('Pago en efectivo').click();
    fixture.detectChanges();

    boton('Guardar cambios').click();
    const patch = patchParametros();
    expect(patch.request.body).toEqual({ efectivo_activo: false });
    patch.flush({ ...PARAMETROS_DTO, efectivo_activo: false });
    responderRelectura({ ...PARAMETROS_DTO, efectivo_activo: false });
  });

  it('guarda el umbral propio de una presentación con su propio PATCH', () => {
    crear();
    escribir(umbralPropio(8), '18');
    expect(boton('Guardar cambios').disabled).toBe(false);

    boton('Guardar cambios').click();
    http.expectNone((r) => r.url === PARAMETROS && r.method === 'PATCH');
    const patch = http.expectOne((r) => r.url === `${PRESENTACIONES}/8` && r.method === 'PATCH');
    expect(patch.request.body).toEqual({ umbral_mayorista: 18 });
    patch.flush({});
    responderRelectura();

    expect(el.textContent).toContain('Parámetros de ventas guardados');
  });

  it('vaciar el umbral propio lo quita (manda null) y rige el global', () => {
    crear();
    escribir(umbralPropio(7), '');

    boton('Guardar cambios').click();
    const patch = http.expectOne((r) => r.url === `${PRESENTACIONES}/7` && r.method === 'PATCH');
    expect(patch.request.body).toEqual({ umbral_mayorista: null });
    patch.flush({});
    responderRelectura();
  });

  it('un umbral propio inválido bloquea el guardado y se marca en la fila', () => {
    crear();
    escribir(umbralPropio(8), '1');

    expect(el.textContent).toContain('Entre 2 y 10,000 unidades');
    boton('Guardar cambios').click();
    fixture.detectChanges();

    http.expectNone((r) => r.method === 'PATCH');
    expect(el.textContent).toContain('Corrige los umbrales propios marcados');
  });

  it('escribir el mismo valor que ya tenía no cuenta como cambio', () => {
    crear();
    escribir(umbralPropio(7), '18');
    escribir(umbralPropio(7), '12');

    expect(boton('Guardar cambios').disabled).toBe(true);
  });

  it('descartar vuelve a lo guardado', () => {
    crear();
    escribir(umbralGlobal(), '99');
    escribir(umbralPropio(8), '30');

    boton('Descartar').click();
    fixture.detectChanges();

    expect(umbralGlobal().value).toBe('24');
    expect(umbralPropio(8).value).toBe('');
    expect(boton('Guardar cambios').disabled).toBe(true);
  });

  it('si el backend rechaza el guardado, muestra su mensaje y conserva lo editado', () => {
    crear();
    escribir(umbralGlobal(), '36');

    boton('Guardar cambios').click();
    patchParametros().flush(
      { message: 'Debe quedar al menos un método de pago activo en el portal' },
      { status: 400, statusText: 'Bad Request' },
    );
    lecturaParametros().flush(PARAMETROS_DTO);
    fixture.detectChanges();
    listadoPresentaciones().flush(pagina([presentacion(7, 'Chifles salados', 12)]));
    fixture.detectChanges();

    expect(el.textContent).toContain('Debe quedar al menos un método de pago activo en el portal');
    expect(umbralGlobal().value).toBe('36');
    expect(boton('Guardar cambios').disabled).toBe(false);
  });

  it('si no se pueden cargar los parámetros ofrece reintentar', () => {
    fixture = TestBed.createComponent(GestionarParametrosVentas);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    lecturaParametros().error(new ProgressEvent('error'));
    fixture.detectChanges();

    expect(el.textContent).toContain('No se pudo conectar con el servidor');
    boton('Reintentar').click();
    lecturaParametros().flush(PARAMETROS_DTO);
    fixture.detectChanges();
    listadoPresentaciones().flush(pagina([]));
    http.expectOne((r) => r.url === PROMOCIONES).flush(pagina([]));
    fixture.detectChanges();

    expect(umbralGlobal().value).toBe('24');
  });
});
