import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { DespachoPedidoResumenDto } from '../../interfaces/despacho-pedido-dto.interface';
import { resumenDto } from '../../testing/despacho-data';
import { DespachoPedidos } from './despacho-pedidos';

const BASE = `${environment.apiUrl}/despacho/pedidos`;

describe('DespachoPedidos (HU-A-023, RF-A094)', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<DespachoPedidos> {
    const fixture = TestBed.createComponent(DespachoPedidos);
    fixture.detectChanges();
    return fixture;
  }

  // El listado de la tabla pide 10 filas; las tarjetas piden 1 por estado.
  const peticionPagina = (extra: (r: TestRequest['request']) => boolean = () => true) =>
    httpMock.expectOne((r) => r.url === BASE && r.params.get('limit') === '10' && extra(r));

  function flushPagina(
    req: TestRequest,
    data: DespachoPedidoResumenDto[] = [],
    total = data.length,
    totalPaginas = total > 0 ? 1 : 0,
    page = 1,
  ) {
    req.flush({ data, meta: { total, page, limit: 10, total_pages: totalPaginas } });
  }

  function flushResumen(totales: Record<string, number> = {}) {
    for (const estado of ['pendiente_entrega', 'en_camino', 'entregado']) {
      const total = totales[estado] ?? 0;
      httpMock
        .expectOne(
          (r) =>
            r.url === BASE && r.params.get('limit') === '1' && r.params.get('estado') === estado,
        )
        .flush({ data: [], meta: { total, page: 1, limit: 1, total_pages: total } });
    }
  }

  it('asks for the first page and for the totals of each state on init', () => {
    const fixture = create();

    const req = peticionPagina((r) => r.params.get('page') === '1');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('estado')).toBe(false);
    flushPagina(req);
    flushResumen();

    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('shows a loading state until the list arrives', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Cargando',
    );
    flushPagina(peticionPagina());
    flushResumen();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('maps a row: order, client, counts, state and no delivery date yet', () => {
    const fixture = create();
    flushPagina(peticionPagina(), [resumenDto()]);
    flushResumen();

    const [fila] = fixture.componentInstance.pedidos();
    expect(fila).toMatchObject({
      codigo: 'PED-000007',
      cliente: 'Supermercados Andina',
      cantidadProductos: 2,
      cantidadUnidades: 34,
      estado: 'pendiente_entrega',
      entregaMostrada: '—',
    });
    expect(fila.fechaMostrada).toContain('2026');
    expect(fila.horaMostrada).toMatch(/\d{2}:\d{2}/);
  });

  it('shows the delivery date of a delivered order', () => {
    const fixture = create();
    flushPagina(peticionPagina(), [
      resumenDto({ estado: 'entregado', fecha_entrega: '2026-11-03T15:00:00.000Z' }),
    ]);
    flushResumen();

    expect(fixture.componentInstance.pedidos()[0].entregaMostrada).toContain('2026');
  });

  it('shows the three summary cards with the real totals', () => {
    const fixture = create();
    flushPagina(peticionPagina());
    flushResumen({ pendiente_entrega: 4, en_camino: 2, entregado: 9 });
    fixture.detectChanges();

    expect(fixture.componentInstance.resumen()).toEqual({
      pendienteEntrega: 4,
      enCamino: 2,
      entregado: 9,
    });
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Pendientes a entregar');
    expect(texto).toContain('En camino');
    expect(texto).toContain('Entregados');
  });

  it('filters by state, goes back to page 1 and sends the state to the backend', () => {
    const fixture = create();
    flushPagina(peticionPagina());
    flushResumen();

    fixture.componentInstance.setEstado('en_camino');

    const req = peticionPagina((r) => r.params.get('estado') === 'en_camino');
    expect(req.request.params.get('page')).toBe('1');
    flushPagina(req, [resumenDto({ estado: 'en_camino' })]);
    expect(fixture.componentInstance.pedidos()[0].estado).toBe('en_camino');

    fixture.componentInstance.setEstado('');
    expect(peticionPagina().request.params.has('estado')).toBe(false);
  });

  it('offers exactly the three dispatch states as filter, none from other areas', () => {
    const fixture = create();
    flushPagina(peticionPagina());
    flushResumen();

    expect(fixture.componentInstance.estadoOptions.map((o) => o.value)).toEqual([
      'pendiente_entrega',
      'en_camino',
      'entregado',
    ]);
  });

  it('shows an empty state when there are no dispatches', () => {
    const fixture = create();
    flushPagina(peticionPagina(), []);
    flushResumen();
    fixture.detectChanges();

    expect(fixture.componentInstance.pedidos()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Sin despachos con estos filtros');
  });

  it('changes page and asks for it', () => {
    const fixture = create();
    flushPagina(peticionPagina(), [resumenDto()], 25, 3);
    flushResumen();

    fixture.componentInstance.cambiarPagina(2);

    const req = peticionPagina((r) => r.params.get('page') === '2');
    flushPagina(req, [resumenDto({ id: 8, codigo: 'PED-000008' })], 25, 3, 2);
    expect(fixture.componentInstance.pagina()).toBe(2);
    expect(fixture.componentInstance.pedidos()[0].codigo).toBe('PED-000008');
  });

  it('ignores a page out of range or the current one', () => {
    const fixture = create();
    flushPagina(peticionPagina(), [resumenDto()], 25, 3);
    flushResumen();

    fixture.componentInstance.cambiarPagina(1);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(0);

    httpMock.expectNone((r) => r.url === BASE);
  });

  it('shows an error with a retry button when the list fails, and recovers', () => {
    const fixture = create();
    peticionPagina().flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });
    flushResumen();
    fixture.detectChanges();

    expect(fixture.componentInstance.errorCarga()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudieron cargar los despachos.',
    );

    const reintentar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.trim() === 'Reintentar')!;
    reintentar.click();
    flushPagina(peticionPagina(), [resumenDto()]);
    fixture.detectChanges();

    expect(fixture.componentInstance.errorCarga()).toBe(false);
    expect(fixture.componentInstance.pedidos()).toHaveLength(1);
  });

  it('falls back to zeros in the cards when the totals fail', () => {
    const fixture = create();
    flushPagina(peticionPagina());
    // Basta con que falle una: el resumen se cancela completo y no queda a medias.
    const [primera] = httpMock.match((r) => r.url === BASE && r.params.get('limit') === '1');
    primera.flush({ message: 'x' }, { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.resumen()).toEqual({
      pendienteEntrega: 0,
      enCamino: 0,
      entregado: 0,
    });
  });

  it('opens the detail of an order and closes it', () => {
    const fixture = create();
    flushPagina(peticionPagina(), [resumenDto()]);
    flushResumen();

    fixture.componentInstance.verDetalle(fixture.componentInstance.pedidos()[0].pedido);
    fixture.detectChanges();
    expect(fixture.componentInstance.pedidoDetalleId()).toBe(7);
    httpMock.expectOne(`${BASE}/7`).flush({ message: 'x' }, { status: 500, statusText: 'x' });

    fixture.componentInstance.cerrarDetalle();
    expect(fixture.componentInstance.pedidoDetalleId()).toBeNull();
  });

  it('reloads the list and the totals when an order changes state in the modal', () => {
    const fixture = create();
    flushPagina(peticionPagina(), [resumenDto()]);
    flushResumen();

    fixture.componentInstance.pedidoActualizado();

    flushPagina(peticionPagina(), [resumenDto({ estado: 'en_camino' })]);
    flushResumen({ pendiente_entrega: 0, en_camino: 1 });
    expect(fixture.componentInstance.pedidos()[0].estado).toBe('en_camino');
    expect(fixture.componentInstance.resumen().enCamino).toBe(1);
  });
});
