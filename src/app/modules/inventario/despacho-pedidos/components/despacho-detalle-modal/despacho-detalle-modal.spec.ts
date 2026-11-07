import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { detalleDto } from '../../testing/despacho-data';
import { DespachoDetalleModal } from './despacho-detalle-modal';

const URL = `${environment.apiUrl}/despacho/pedidos/7`;

describe('DespachoDetalleModal (HU-A-023, RF-A095 a RF-A098)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<DespachoDetalleModal>;
  let avisos: number;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const raiz = () => fixture.nativeElement as HTMLElement;
  const botones = () =>
    Array.from(raiz().querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
  const boton = (texto: string) =>
    Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);

  /** Abre el modal de un pedido y responde el detalle con el estado indicado. */
  function abrir(over: Parameters<typeof detalleDto>[0] = {}) {
    fixture = TestBed.createComponent(DespachoDetalleModal);
    avisos = 0;
    fixture.componentInstance.actualizado.subscribe(() => (avisos += 1));
    fixture.detectChanges();
    fixture.componentRef.setInput('pedidoId', 7);
    fixture.detectChanges();
    httpMock.expectOne(URL).flush(detalleDto(over));
    fixture.detectChanges();
  }

  it('does not request anything while it is closed', () => {
    fixture = TestBed.createComponent(DespachoDetalleModal);
    fixture.detectChanges();

    httpMock.expectNone(URL);
  });

  it('shows the order data, its address and its lines (RF-A095)', () => {
    abrir();

    const campos = fixture.componentInstance.campos();
    expect(campos).toContainEqual({ label: 'Cliente', value: 'Supermercados Andina' });
    expect(campos).toContainEqual({ label: 'Tipo de entrega', value: 'Delivery' });
    expect(campos).toContainEqual({
      label: 'Dirección de entrega',
      value: 'Av. Los Girasoles 123',
    });
    expect(campos).toContainEqual({ label: 'Productos', value: '2 productos' });
    expect(campos).toContainEqual({ label: 'Unidades', value: '34' });
    expect(fixture.componentInstance.filas()[0]).toMatchObject({
      producto: 'Chifles salados',
      sku: 'FR-P1-PR1',
      presentacion: '250 gr',
      cantidadMostrada: '30 unid.',
    });
    expect(raiz().textContent).toContain('Pendiente a entregar');
  });

  it('writes "producto" in singular when the order has a single line', () => {
    abrir({ items: [detalleDto().items[0]] });

    expect(fixture.componentInstance.campos()).toContainEqual({
      label: 'Productos',
      value: '1 producto',
    });
  });

  it('has no address field for a store pickup', () => {
    abrir({ tipo_entrega: 'recojo_tienda', direccion_entrega: null });

    const etiquetas = fixture.componentInstance.campos().map((c) => c.label);
    expect(etiquetas).not.toContain('Dirección de entrega');
    expect(fixture.componentInstance.campos()).toContainEqual({
      label: 'Tipo de entrega',
      value: 'Recojo en tienda',
    });
  });

  it('offers only "Iniciar despacho" for a pending order', () => {
    abrir({ estado: 'pendiente_entrega' });

    expect(botones()).toContain('Iniciar despacho');
    expect(botones()).not.toContain('Marcar como entregado');
  });

  it('offers only "Marcar como entregado" for an order on its way', () => {
    abrir({ estado: 'en_camino' });

    expect(botones()).toContain('Marcar como entregado');
    expect(botones()).not.toContain('Iniciar despacho');
  });

  it('is read only for a delivered order and shows when it was delivered (RF-A098)', () => {
    abrir({ estado: 'entregado', fecha_entrega: '2026-11-03T15:00:00.000Z' });

    expect(botones()).not.toContain('Iniciar despacho');
    expect(botones()).not.toContain('Marcar como entregado');
    expect(botones()).toContain('Cerrar');
    const entregado = fixture.componentInstance.campos().find((c) => c.label === 'Entregado el');
    expect(entregado?.value).toContain('2026');
    expect(raiz().textContent).toContain('solo lectura');
  });

  it('puts the order on its way, keeps the modal open and offers to deliver it (RF-A096)', () => {
    abrir({ estado: 'pendiente_entrega' });

    boton('Iniciar despacho')!.click();
    httpMock.expectOne(`${URL}/en-camino`).flush(detalleDto({ estado: 'en_camino' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.pedido()?.estado).toBe('en_camino');
    expect(botones()).toContain('Marcar como entregado');
    expect(botones()).not.toContain('Iniciar despacho');
    expect(avisos).toBe(1);
    expect(fixture.componentInstance.errorAvance()).toBe('');
  });

  it('marks the order as delivered with its delivery date and tells the list (RF-A098)', () => {
    abrir({ estado: 'en_camino' });

    boton('Marcar como entregado')!.click();
    httpMock
      .expectOne(`${URL}/entregado`)
      .flush(detalleDto({ estado: 'entregado', fecha_entrega: '2026-11-03T15:00:00.000Z' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.pedido()?.estado).toBe('entregado');
    expect(fixture.componentInstance.campos().map((c) => c.label)).toContain('Entregado el');
    expect(botones()).not.toContain('Marcar como entregado');
    expect(avisos).toBe(1);
  });

  it('blocks the action while the request is in flight so it cannot be sent twice', () => {
    abrir({ estado: 'pendiente_entrega' });

    boton('Iniciar despacho')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.avanzando()).toBe(true);
    expect(boton('Iniciar despacho')!.disabled).toBe(true);
    fixture.componentInstance.iniciarDespacho();
    httpMock.expectOne(`${URL}/en-camino`).flush(detalleDto({ estado: 'en_camino' }));
  });

  it('explains a 409 when starting the dispatch, reloads the order and refreshes the list', () => {
    abrir({ estado: 'pendiente_entrega' });

    boton('Iniciar despacho')!.click();
    httpMock
      .expectOne(`${URL}/en-camino`)
      .flush({ message: 'x' }, { status: 409, statusText: 'Conflict' });
    // Otra persona ya lo sacó a reparto: al releerlo se ve el estado real.
    httpMock.expectOne(URL).flush(detalleDto({ estado: 'en_camino' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.errorAvance()).toContain('ya cambió de estado');
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('ya cambió de estado');
    expect(fixture.componentInstance.pedido()?.estado).toBe('en_camino');
    expect(avisos).toBe(1);
  });

  it('explains a 409 when delivering, reloads the order and registers no change', () => {
    abrir({ estado: 'en_camino' });

    boton('Marcar como entregado')!.click();
    httpMock
      .expectOne(`${URL}/entregado`)
      .flush({ message: 'x' }, { status: 409, statusText: 'Conflict' });
    httpMock.expectOne(URL).flush(detalleDto({ estado: 'en_camino' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.errorAvance()).toBe(
      'No se pudo marcar como entregado. Se actualizó la información del pedido.',
    );
    expect(fixture.componentInstance.pedido()?.estado).toBe('en_camino');
    expect(boton('Marcar como entregado')).toBeTruthy();
  });

  it('shows a generic error for any other failure and keeps the order as it was', () => {
    abrir({ estado: 'en_camino' });

    boton('Marcar como entregado')!.click();
    httpMock
      .expectOne(`${URL}/entregado`)
      .flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.errorAvance()).toContain('No se pudo marcar');
    expect(fixture.componentInstance.pedido()?.estado).toBe('en_camino');
    expect(avisos).toBe(0);
  });

  it('says the order no longer exists on a 404', () => {
    abrir({ estado: 'pendiente_entrega' });

    boton('Iniciar despacho')!.click();
    httpMock
      .expectOne(`${URL}/en-camino`)
      .flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.componentInstance.errorAvance()).toContain('ya no existe');
  });

  it('shows an error with a retry button when the detail cannot be loaded', () => {
    fixture = TestBed.createComponent(DespachoDetalleModal);
    fixture.detectChanges();
    fixture.componentRef.setInput('pedidoId', 7);
    fixture.detectChanges();
    httpMock.expectOne(URL).flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(raiz().textContent).toContain('No se pudo cargar el detalle del pedido.');
    expect(botones()).not.toContain('Iniciar despacho');

    boton('Reintentar')!.click();
    httpMock.expectOne(URL).flush(detalleDto());
    fixture.detectChanges();

    expect(fixture.componentInstance.pedido()?.codigo).toBe('PED-000007');
  });

  it('closes and clears the order', () => {
    abrir();
    let cerrado = 0;
    fixture.componentInstance.closed.subscribe(() => (cerrado += 1));

    fixture.componentInstance.cerrar();

    expect(cerrado).toBe(1);
    expect(fixture.componentInstance.pedido()).toBeNull();
  });
});
