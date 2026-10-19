import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultadoGuardado } from '../../interfaces/pedido.interface';
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

  describe('move to "En espera de inventario" (HU-A-010)', () => {
    const boton = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Pasar a En espera de inventario'),
      );

    let avisos: ResultadoGuardado[];

    beforeEach(() => {
      avisos = [];
      fixture.componentInstance.estadoCambiado.subscribe((a) => avisos.push(a));
    });

    it('changes the status right away, keeps the detail open and emits the notice', () => {
      abrir(1);
      httpMock.expectOne(`${API}/pedidos/1`).flush(makeDetalleDto());
      fixture.detectChanges();

      boton()?.click();

      const req = httpMock.expectOne(`${API}/pedidos/1/estado`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ estado: 'en_espera_inventario' });
      req.flush(makeDetalleDto({ estado: 'en_espera_inventario' }));
      fixture.detectChanges();

      expect(avisos).toEqual([
        {
          tono: 'ok',
          mensaje: 'Pedido PED-000001 pasó a En espera de inventario · visible para Inventario.',
        },
      ]);
      expect(texto()).toContain('En espera de inventario');
      expect(boton()).toBeUndefined();
    });

    it('is not offered when the order is no longer confirmed', () => {
      abrir(1);
      httpMock
        .expectOne(`${API}/pedidos/1`)
        .flush(makeDetalleDto({ estado: 'en_espera_inventario' }));
      fixture.detectChanges();

      expect(boton()).toBeUndefined();
    });

    it('emits the API message when the change is rejected', () => {
      abrir(1);
      httpMock.expectOne(`${API}/pedidos/1`).flush(makeDetalleDto());
      fixture.detectChanges();

      boton()?.click();
      httpMock
        .expectOne(`${API}/pedidos/1/estado`)
        .flush(
          { statusCode: 409, message: 'El pedido PED-000001 cambió de estado mientras tanto' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(avisos).toEqual([
        { tono: 'error', mensaje: 'El pedido PED-000001 cambió de estado mientras tanto' },
      ]);
    });
  });
});
