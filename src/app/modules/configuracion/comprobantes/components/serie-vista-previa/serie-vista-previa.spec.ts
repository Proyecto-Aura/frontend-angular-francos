import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { toSerieComprobante } from '../../mappers/serie-comprobante.mapper';
import { makeSerieDto } from '../../testing/serie-fixtures';
import { SerieVistaPrevia } from './serie-vista-previa';

const EMPRESA = `${environment.apiUrl}/empresa`;

const FACTURA = toSerieComprobante(makeSerieDto());
const BOLETA = toSerieComprobante(
  makeSerieDto({
    id: 2,
    tipo: 'boleta',
    serie: 'B001',
    correlativo_actual: 12406,
    siguiente: 12407,
  }),
);
const FACTURA_INACTIVA = toSerieComprobante(makeSerieDto({ id: 3, serie: 'F002', estado: false }));
const FACTURA_AGOTADA = toSerieComprobante(
  makeSerieDto({ id: 4, serie: 'F003', siguiente: null, restantes: 0 }),
);

describe('SerieVistaPrevia', () => {
  let fixture: ComponentFixture<SerieVistaPrevia>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SerieVistaPrevia],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SerieVistaPrevia);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('series', [FACTURA, BOLETA]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const responderEmpresa = () => {
    http.expectOne(EMPRESA).flush({
      razon_social: 'Inversiones Francos S.A.C.',
      ruc: '20601458732',
      direccion: 'Av. Principal 123',
      telefono: '012345678',
      email: 'facturacion@francos.test',
      logo_url: null,
    });
    fixture.detectChanges();
  };

  it('muestra la cabecera con los datos de la empresa y el próximo número de la factura', () => {
    responderEmpresa();

    const texto = el.textContent ?? '';
    expect(texto).toContain('Inversiones Francos S.A.C.');
    expect(texto).toContain('Av. Principal 123');
    expect(texto).toContain('012345678 · facturacion@francos.test');
    expect(texto).toContain('RUC 20601458732');
    expect(texto).toContain('FACTURA ELECTRÓNICA');
    expect(texto).toContain('F001-00001848');
  });

  it('una factura muestra valor de venta, operación gravada e IGV', () => {
    responderEmpresa();

    const texto = el.textContent ?? '';
    expect(texto).toContain('Valor venta');
    expect(texto).toContain('Condición de pago');
    expect(texto).toContain('Op. gravada');
    expect(texto).toContain('S/ 327.12');
    expect(texto).toContain('IGV 18%');
    expect(texto).toContain('S/ 58.88');
    expect(texto).toContain('Importe total');
    expect(texto).toContain('S/ 386.00');
  });

  it('al elegir la boleta cambia el tipo, el número y los totales', () => {
    responderEmpresa();
    const select = el.querySelector<HTMLSelectElement>('select#vp-serie')!;

    select.value = '2';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const texto = el.textContent ?? '';
    expect(texto).toContain('BOLETA DE VENTA ELECTRÓNICA');
    expect(texto).toContain('B001-00012407');
    expect(texto).toContain('Importe');
    expect(texto).toContain('Total (IGV incluido)');
    expect(texto).not.toContain('Op. gravada');
  });

  it('solo ofrece las series activas y con correlativos disponibles', () => {
    fixture.componentRef.setInput('series', [FACTURA, FACTURA_INACTIVA, FACTURA_AGOTADA, BOLETA]);
    fixture.detectChanges();
    responderEmpresa();

    const opciones = Array.from(
      el.querySelectorAll<HTMLOptionElement>('select#vp-serie option'),
    ).map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['F001 · Factura electrónica', 'B001 · Boleta de venta electrónica']);
  });

  it('sin datos de empresa muestra la cabecera con textos de referencia', () => {
    http.expectOne(EMPRESA).flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(el.textContent).toContain('Razón social');
    expect(el.textContent).toContain('Dirección fiscal');
  });

  it('sin series activas lo indica y no muestra el detalle', () => {
    fixture.componentRef.setInput('series', [FACTURA_INACTIVA]);
    fixture.detectChanges();
    responderEmpresa();

    expect(el.textContent).toContain('Sin series activas');
    expect(el.textContent).not.toContain('Cant.');
  });
});
