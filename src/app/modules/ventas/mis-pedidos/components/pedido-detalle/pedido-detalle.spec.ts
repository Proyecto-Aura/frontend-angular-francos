import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API, makeDetalleDto } from '../../testing/pedidos.fixtures';
import { PedidoDetalle } from './pedido-detalle';

describe('PedidoDetalle', () => {
  let fixture: ComponentFixture<PedidoDetalle>;
  let httpMock: HttpTestingController;

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PedidoDetalle);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  const abrir = (id: number) => {
    fixture.componentRef.setInput('pedidoId', id);
    fixture.detectChanges();
  };

  it('does not request anything while closed', () => {
    httpMock.expectNone((r) => r.url.startsWith(`${API}/pedidos`));
  });

  it('shows the order products, total and payment (RF-A031)', () => {
    abrir(1);
    httpMock.expectOne(`${API}/pedidos/1`).flush(makeDetalleDto());
    fixture.detectChanges();

    expect(texto()).toContain('Pedido PED-000001');
    expect(texto()).toContain('Chifles clásicos 100 gr');
    expect(texto()).toContain('Mayorista');
    expect(texto()).toContain('Total del pedido');
    expect(texto()).toContain('Efectivo');
    expect(texto()).toContain('Pendiente de emisión');
  });

  it('shows the Culqi operation number', () => {
    abrir(2);
    httpMock.expectOne(`${API}/pedidos/2`).flush(
      makeDetalleDto({
        pago: {
          metodo_pago: 'culqi',
          monto: 165.6,
          numero_operacion: 'chr_test_abc123',
          fecha_pago: '2026-10-17T15:04:00.000Z',
          comprobante: null,
        },
      }),
    );
    fixture.detectChanges();

    expect(texto()).toContain('chr_test_abc123');
  });

  it('warns when the order could not be loaded', () => {
    abrir(99);
    httpMock
      .expectOne(`${API}/pedidos/99`)
      .flush(
        { statusCode: 404, message: 'Pedido no encontrado' },
        { status: 404, statusText: 'x' },
      );
    fixture.detectChanges();

    expect(texto()).toContain('Pedido no encontrado');
  });
});
