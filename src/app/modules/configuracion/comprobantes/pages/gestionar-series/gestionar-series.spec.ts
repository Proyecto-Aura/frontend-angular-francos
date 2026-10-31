import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { SerieComprobanteDto } from '../../interfaces/serie-comprobante-dto.interface';
import { makePaginaSeriesDto, makeSerieDto } from '../../testing/serie-fixtures';
import { GestionarSeries } from './gestionar-series';

const SERIES = `${environment.apiUrl}/series-comprobante`;
const EMPRESA = `${environment.apiUrl}/empresa`;

// F001: casi sin uso. F002: 92 % usada, desactivada. B002: 98 % usada, activa. F003: agotada.
const F001 = makeSerieDto();
const F002 = makeSerieDto({
  id: 2,
  serie: 'F002',
  correlativo_fin: 5000,
  correlativo_actual: 4612,
  siguiente: 4613,
  restantes: 388,
  estado: false,
});
const B002 = makeSerieDto({
  id: 3,
  tipo: 'boleta',
  serie: 'B002',
  correlativo_fin: 2000,
  correlativo_actual: 1963,
  siguiente: 1964,
  restantes: 37,
});
const F003 = makeSerieDto({
  id: 4,
  serie: 'F003',
  correlativo_fin: 1000,
  correlativo_actual: 1000,
  siguiente: null,
  restantes: 0,
});

describe('GestionarSeries', () => {
  let fixture: ComponentFixture<GestionarSeries>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const listados = () => http.match((r) => r.url === SERIES && r.method === 'GET');
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    );
  const acciones = () =>
    (
      fixture.componentInstance as unknown as {
        accionesPorSerie(): Map<number, { label?: string; onSelect?: () => void }[]>;
      }
    ).accionesPorSerie();
  const elegir = (indice: number, valor: string) => {
    const select = el.querySelectorAll<HTMLSelectElement>('select')[indice];
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const filasDeTabla = () => el.querySelectorAll('app-ds-data-table tbody tr').length;

  /** Crea la pantalla y responde lo que pide al abrirse. */
  function crear(series: SerieComprobanteDto[] = [F001, F002, B002, F003]) {
    fixture = TestBed.createComponent(GestionarSeries);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    listados()[0].flush(makePaginaSeriesDto(series));
    http.expectOne(EMPRESA).flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [GestionarSeries],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('lista las series con rango, próximo correlativo y estado', () => {
    crear();

    const texto = el.textContent ?? '';
    expect(texto).toContain('Gestionar series de comprobantes');
    expect(texto).toContain('Factura electrónica');
    expect(texto).toContain('00000001 – 99999999');
    expect(texto).toContain('F001-00001848');
    expect(texto).toContain('Activa');
    expect(texto).toContain('Inactiva');
    expect(texto).toContain('Por agotarse');
    expect(texto).toContain('Agotada');
  });

  it('pide todas las series una sola vez, sin filtros en el servidor', () => {
    fixture = TestBed.createComponent(GestionarSeries);
    fixture.detectChanges();

    const [pedido] = listados();
    expect(pedido.request.params.get('limit')).toBe('100');
    expect(pedido.request.params.has('tipo')).toBe(false);
    expect(pedido.request.params.has('estado')).toBe(false);
    pedido.flush(makePaginaSeriesDto([]));
    http.expectOne(EMPRESA).flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
  });

  it('muestra el uso del rango y cuántos correlativos quedan', () => {
    crear();

    expect(el.textContent).toContain('<1% · 99,998,152 disponibles');
    expect(el.textContent).toContain('98% · 37 disponibles');
    expect(el.textContent).toContain('100% · 0 disponibles');
  });

  it('una serie agotada no tiene próximo correlativo', () => {
    crear([F003]);

    expect(el.querySelector('app-ds-data-table')?.textContent).toContain('—');
    expect(el.querySelector('app-ds-data-table')?.textContent).not.toContain('F003-');
  });

  it('sin series muestra el estado vacío', () => {
    crear([]);

    expect(el.textContent).toContain('Sin series registradas');
  });

  describe('alerta de series próximas a agotar', () => {
    it('avisa solo de las activas que llegaron al porcentaje (90 % por defecto)', () => {
      crear();

      const aviso = el.querySelector('[role="alert"]');
      expect(aviso?.textContent).toContain('1 serie');
      expect(aviso?.textContent).toContain('Serie próxima a agotar su rango');
      expect(aviso?.textContent).toContain('B002: 37 correlativos disponibles');
      expect(aviso?.textContent).toContain(
        'Ampliar el correlativo final o registrar una nueva serie',
      );
      // F002 está al 92 % pero desactivada, y F003 está agotada: ninguna cuenta.
      expect(aviso?.textContent).not.toContain('F002');
      expect(aviso?.textContent).not.toContain('F003');
    });

    it('no aparece si ninguna serie llegó al porcentaje', () => {
      crear([F001]);

      expect(el.querySelector('[role="alert"]')).toBeNull();
    });

    it('al subir el porcentaje deja de alertar la serie que aún no lo alcanza', () => {
      // 92 % usada: alerta con 90 % y deja de alertar con 95 %.
      const casiLlena = makeSerieDto({
        id: 6,
        serie: 'F006',
        correlativo_fin: 5000,
        correlativo_actual: 4612,
        siguiente: 4613,
        restantes: 388,
      });
      crear([F001, casiLlena]);
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('F006');

      elegir(2, '95');

      expect(el.querySelector('[role="alert"]')).toBeNull();
    });

    it('una serie al 98 % sigue alertando con el porcentaje más alto', () => {
      crear([F001, B002]);

      elegir(2, '95');

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('B002');
    });

    it('al bajar el porcentaje alertan más series y usa el plural', () => {
      const casi = makeSerieDto({
        id: 5,
        serie: 'F004',
        correlativo_fin: 1000,
        correlativo_actual: 750,
        siguiente: 751,
        restantes: 250,
      });
      crear([F001, B002, casi]);
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('1 serie');

      elegir(2, '70');

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('2 series');
      expect(el.querySelector('[role="alert"]')?.textContent).toContain(
        'Series próximas a agotar su rango',
      );
    });

    it('recuerda el porcentaje elegido en este navegador', () => {
      crear();

      elegir(2, '80');

      expect(localStorage.getItem('francos-series-umbral')).toBe('80');
    });

    it('al abrir usa el porcentaje que se guardó', () => {
      localStorage.setItem('francos-series-umbral', '70');
      crear();

      const select = el.querySelectorAll<HTMLSelectElement>('select')[2];
      expect(select.value).toBe('70');
    });
  });

  describe('filtros', () => {
    it('por tipo deja solo ese tipo', () => {
      crear();
      expect(filasDeTabla()).toBe(4);

      elegir(0, 'boleta');

      expect(filasDeTabla()).toBe(1);
      expect(el.querySelector('app-ds-data-table')?.textContent).toContain('B002');
    });

    it('"Por agotarse" deja las que alertan', () => {
      crear();

      elegir(1, 'alerta');

      expect(filasDeTabla()).toBe(1);
      expect(el.querySelector('app-ds-data-table')?.textContent).toContain('B002');
    });

    it('"Inactiva" deja las desactivadas', () => {
      crear();

      elegir(1, 'inactiva');

      expect(filasDeTabla()).toBe(1);
      expect(el.querySelector('app-ds-data-table')?.textContent).toContain('F002');
    });

    it('"Agotada" deja las que no tienen correlativos', () => {
      crear();

      elegir(1, 'agotada');

      expect(filasDeTabla()).toBe(1);
      expect(el.querySelector('app-ds-data-table')?.textContent).toContain('F003');
    });

    it('sin coincidencias muestra el estado vacío', () => {
      crear([F001]);

      elegir(1, 'agotada');

      expect(el.textContent).toContain('Sin series registradas');
    });
  });

  it('si falla la carga muestra el error y Reintentar vuelve a consultar', () => {
    fixture = TestBed.createComponent(GestionarSeries);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne(EMPRESA).flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    listados()[0].flush({ message: 'Error interno' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('Error interno');

    boton('Reintentar')!.click();
    fixture.detectChanges();
    listados()[0].flush(makePaginaSeriesDto([F001]));
    fixture.detectChanges();

    expect(el.textContent).toContain('F001-00001848');
  });

  describe('acciones por fila', () => {
    const etiquetas = (id: number) =>
      (acciones().get(id) ?? []).map((accion) => accion.label).filter(Boolean);

    it('una serie activa se puede editar y desactivar', () => {
      crear();

      expect(etiquetas(1)).toEqual(['Editar', 'Desactivar']);
    });

    it('una serie inactiva se puede editar y activar', () => {
      crear();

      expect(etiquetas(2)).toEqual(['Editar', 'Activar']);
    });

    it('una serie agotada y desactivada solo se puede editar', () => {
      crear([makeSerieDto({ id: 9, serie: 'F009', siguiente: null, restantes: 0, estado: false })]);

      expect(etiquetas(9)).toEqual(['Editar']);
    });
  });

  it('"Nueva serie" abre el formulario de alta', () => {
    crear();

    boton('Nueva serie')!.click();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Nueva serie');
  });

  it('"Editar" abre el formulario con los datos de la serie', () => {
    crear();

    acciones()
      .get(1)!
      .find((a) => a.label === 'Editar')!.onSelect!();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Editar serie F001');
    expect(el.querySelector<HTMLInputElement>('input#s-serie')?.value).toBe('F001');
  });

  it('"Desactivar" pide confirmación antes de llamar al backend', () => {
    crear();

    acciones()
      .get(1)!
      .find((a) => a.label === 'Desactivar')!.onSelect!();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Desactivar serie');
    http.expectNone({ method: 'DELETE', url: `${SERIES}/1` });
  });

  it('activar muestra el aviso y recarga las series', () => {
    crear();

    acciones()
      .get(2)!
      .find((a) => a.label === 'Activar')!.onSelect!();
    http
      .expectOne({ method: 'PATCH', url: `${SERIES}/2/activate` })
      .flush({ ...F002, estado: true });
    fixture.detectChanges();

    expect(el.textContent).toContain('Serie F002 activada');
    listados()[0].flush(makePaginaSeriesDto([F001, { ...F002, estado: true }]));
  });

  it('si no se puede activar muestra el error del backend', () => {
    crear();

    acciones()
      .get(2)!
      .find((a) => a.label === 'Activar')!.onSelect!();
    http.expectOne({ method: 'PATCH', url: `${SERIES}/2/activate` }).flush(
      {
        message: 'Ya existe una serie activa de tipo factura; desactívala antes de activar esta',
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(el.textContent).toContain('Ya existe una serie activa de tipo factura');
  });
});
