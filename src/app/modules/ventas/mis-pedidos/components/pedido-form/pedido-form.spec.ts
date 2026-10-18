import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { PedidoFormModel, ResultadoGuardado } from '../../interfaces/pedido.interface';
import { CulqiCheckoutService } from '../../services/culqi-checkout.service';
import {
  API,
  CLIENTE_ID,
  flushOpcionesRegistro,
  makeDetalleDto,
  makeFormValido,
} from '../../testing/pedidos.fixtures';
import { PedidoForm } from './pedido-form';

interface PedidoFormApi {
  pf: WritableSignal<PedidoFormModel>;
  errores: Signal<string[]>;
  errorApi: Signal<string>;
  total: Signal<number>;
  setCliente(id: string): void;
  guardar(): void;
}

describe('PedidoForm', () => {
  let fixture: ComponentFixture<PedidoForm>;
  let form: PedidoFormApi;
  let httpMock: HttpTestingController;
  let pedirToken: (monto: number) => Observable<string>;
  let registrados: ResultadoGuardado[];
  let cerrado: boolean;

  beforeEach(() => {
    pedirToken = () => of('tkn_test_1');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CulqiCheckoutService,
          useValue: { disponible: true, pedirToken: (m: number) => pedirToken(m) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PedidoForm);
    form = fixture.componentInstance as unknown as PedidoFormApi;
    registrados = [];
    cerrado = false;
    fixture.componentInstance.registrado.subscribe((r) => registrados.push(r));
    fixture.componentInstance.closed.subscribe(() => (cerrado = true));

    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();
    flushOpcionesRegistro(httpMock);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('loads clients and products when opened', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Registrar pedido');
    expect(texto).not.toContain('Cargando clientes');
  });

  it('suggests the client address when selected', () => {
    form.setCliente(CLIENTE_ID);
    expect(form.pf().direccion).toBe('Jr. Las Magnolias 312, Surco');
  });

  it('estimates the total with the wholesale price (RN17)', () => {
    form.pf.set(makeFormValido());
    expect(form.total()).toBe(165.6);
  });

  it('does not submit an incomplete order', () => {
    form.guardar();

    expect(form.errores()).toContain('cliente');
    httpMock.expectNone(`${API}/pedidos`);
  });

  it('registers a cash order and notifies its code', () => {
    form.pf.set(makeFormValido());
    form.guardar();

    const req = httpMock.expectOne(`${API}/pedidos`);
    expect(req.request.body).toEqual({
      cliente_id: CLIENTE_ID,
      items: [
        { producto_presentacion_id: 10, cantidad: 30 },
        { producto_presentacion_id: 11, cantidad: 4 },
      ],
      tipo_entrega: 'delivery',
      direccion_entrega: 'Av. La Marina 1450, San Miguel',
      metodo_pago: 'efectivo',
    });
    req.flush(makeDetalleDto({ codigo: 'PED-000042' }));

    expect(registrados[0].tono).toBe('ok');
    expect(registrados[0].mensaje).toContain('PED-000042');
    expect(cerrado).toBe(true);
  });

  it('with Culqi, requests a token for the total and sends it on register', () => {
    let montoCobrado = 0;
    pedirToken = (monto) => {
      montoCobrado = monto;
      return of('tkn_test_1');
    };
    form.pf.set(makeFormValido({ metodoPago: 'culqi' }));
    form.guardar();

    const req = httpMock.expectOne(`${API}/pedidos`);
    expect(montoCobrado).toBe(165.6);
    expect(req.request.body).toMatchObject({ metodo_pago: 'culqi', culqi_token: 'tkn_test_1' });
    req.flush(makeDetalleDto());
  });

  it('shows the Culqi message and keeps the form open when the payment is declined', () => {
    form.pf.set(makeFormValido({ metodoPago: 'culqi' }));
    form.guardar();

    httpMock
      .expectOne(`${API}/pedidos`)
      .flush(
        { statusCode: 402, message: 'Tu tarjeta no tiene fondos suficientes.' },
        { status: 402, statusText: 'Payment Required' },
      );

    expect(form.errorApi()).toBe('Tu tarjeta no tiene fondos suficientes.');
    expect(registrados).toEqual([]);
    expect(cerrado).toBe(false);
  });

  it('does not call the API when the Culqi checkout fails', () => {
    pedirToken = () => throwError(() => new Error('Culqi no pudo procesar el pago.'));
    form.pf.set(makeFormValido({ metodoPago: 'culqi' }));
    form.guardar();

    expect(form.errorApi()).toBe('Culqi no pudo procesar el pago.');
    httpMock.expectNone(`${API}/pedidos`);
  });

  it('warns that Culqi runs in test mode when it is selected', () => {
    form.pf.set(makeFormValido({ metodoPago: 'culqi' }));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Culqi en modo de pruebas',
    );
  });
});
