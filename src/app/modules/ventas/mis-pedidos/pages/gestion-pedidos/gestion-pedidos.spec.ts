import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PedidoFila, ResultadoGuardado } from '../../interfaces/pedido.interface';
import { API, makeResumenDto, page as pagina } from '../../testing/pedidos.fixtures';
import { GestionPedidos } from './gestion-pedidos';

// Los miembros de la página son `protected`: el spec los consulta mediante esta vista tipada.
interface GestionPedidosApi {
  page: WritableSignal<number>;
  pageCount: Signal<number>;
  rangoInvalido: Signal<boolean>;
  formAbierto: Signal<boolean>;
  pedidoDetalleId: Signal<number | null>;
  aviso: Signal<ResultadoGuardado>;
  setEstado(v: string): void;
  setOrigen(v: string): void;
  setDesde(v: string): void;
  setHasta(v: string): void;
  limpiarFiltros(): void;
  cambiarPagina(page: number): void;
  verPedido(fila: PedidoFila): void;
  nuevoPedido(): void;
  pedidoRegistrado(resultado: ResultadoGuardado): void;
  estadoCambiado(resultado: ResultadoGuardado): void;
}

describe('GestionPedidos', () => {
  let fixture: ComponentFixture<GestionPedidos>;
  let pagina$: GestionPedidosApi;
  let httpMock: HttpTestingController;

  const esperarListado = () => httpMock.expectOne((r) => r.url === `${API}/pedidos`);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionPedidos);
    pagina$ = fixture.componentInstance as unknown as GestionPedidosApi;
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('loads the first page on open and shows the orders', () => {
    const req = esperarListado();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(pagina([makeResumenDto(), makeResumenDto({ id: 2, codigo: 'PED-000002' })], 23));
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('PED-000001');
    expect(texto).toContain('PED-000002');
    expect(texto).toContain('Rosa Elena Quispe Huamán');
    expect(pagina$.pageCount()).toBe(3);
  });

  it('associates every filter label with its control', () => {
    esperarListado().flush(pagina([], 0));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    for (const id of ['pedidos-estado', 'pedidos-origen', 'pedidos-desde', 'pedidos-hasta']) {
      const label = root.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
      expect(label?.control?.matches('select, input')).toBe(true);
    }
  });

  it('goes back to page 1 and queries with the filter when it changes', () => {
    esperarListado().flush(pagina([], 30));
    pagina$.cambiarPagina(3);
    expect(esperarListado().request.params.get('page')).toBe('3');

    pagina$.setOrigen('portal');

    const req = esperarListado();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('origen')).toBe('portal');
    expect(pagina$.page()).toBe(1);
  });

  it('does not query with an inverted date range', () => {
    esperarListado().flush(pagina([]));

    pagina$.setHasta('2026-10-01');
    esperarListado().flush(pagina([]));
    pagina$.setDesde('2026-10-31');

    expect(pagina$.rangoInvalido()).toBe(true);
    httpMock.expectNone((r) => r.url === `${API}/pedidos`);
  });

  it('clears all filters', () => {
    esperarListado().flush(pagina([]));
    pagina$.setEstado('entregado');
    esperarListado().flush(pagina([]));

    pagina$.limpiarFiltros();

    expect(esperarListado().request.params.has('estado')).toBe(false);
  });

  it('opens the detail of the selected order', () => {
    esperarListado().flush(pagina([]));

    pagina$.verPedido({ id: 7 } as PedidoFila);
    fixture.detectChanges();

    expect(pagina$.pedidoDetalleId()).toBe(7);
    httpMock.expectOne(`${API}/pedidos/7`).flush(null, { status: 404, statusText: 'Not Found' });
  });

  it('shows the notice and reloads the list after registering', () => {
    esperarListado().flush(pagina([]));

    pagina$.pedidoRegistrado({ tono: 'ok', mensaje: 'Pedido PED-000009 registrado' });

    expect(pagina$.aviso().mensaje).toBe('Pedido PED-000009 registrado');
    esperarListado().flush(pagina([makeResumenDto({ id: 9, codigo: 'PED-000009' })]));
  });

  it('offers a retry when the list fails to load', () => {
    esperarListado().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se pudieron cargar los pedidos.',
    );
  });

  it('shows the status change notice and reloads the list (HU-A-010)', () => {
    esperarListado().flush(pagina([]));

    pagina$.estadoCambiado({
      tono: 'ok',
      mensaje: 'Pedido PED-000001 pasó a En espera de inventario · visible para Inventario.',
    });

    expect(pagina$.aviso().mensaje).toBe(
      'Pedido PED-000001 pasó a En espera de inventario · visible para Inventario.',
    );
    esperarListado().flush(pagina([]));
  });

  it('shows the error without reloading when the status change fails', () => {
    esperarListado().flush(pagina([]));

    pagina$.estadoCambiado({ tono: 'error', mensaje: 'No se pudo pasar el pedido' });

    expect(pagina$.aviso().tono).toBe('error');
    httpMock.expectNone((r) => r.url === `${API}/pedidos`);
  });
});
