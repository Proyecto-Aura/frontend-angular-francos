import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ResumenDespacho } from '../interfaces/despacho-pedido.interface';
import { detalleDto, resumenDto } from '../testing/despacho-data';
import { DespachoPedidoService } from './despacho-pedido.service';

const BASE = `${environment.apiUrl}/despacho/pedidos`;

describe('DespachoPedidoService (HU-A-023)', () => {
  let service: DespachoPedidoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DespachoPedidoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a page of dispatch orders without a state filter by default', () => {
    let total = 0;
    service.listar().subscribe((p) => (total = p.total));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.has('estado')).toBe(false);
    req.flush({ data: [resumenDto()], meta: { total: 1, page: 1, limit: 10, total_pages: 1 } });

    expect(total).toBe(1);
  });

  it('sends the page, the limit and the state filter', () => {
    service.listar(3, 5, { estado: 'en_camino' }).subscribe();

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('limit')).toBe('5');
    expect(req.request.params.get('estado')).toBe('en_camino');
    req.flush({ data: [], meta: { total: 0, page: 3, limit: 5, total_pages: 0 } });
  });

  it('builds the summary from the total of each state', () => {
    let resumen: ResumenDespacho | undefined;
    service.resumen().subscribe((r) => (resumen = r));

    const totales: Record<string, number> = { pendiente_entrega: 4, en_camino: 2, entregado: 9 };
    for (const estado of Object.keys(totales)) {
      const req = httpMock.expectOne(
        (r) => r.url === BASE && r.params.get('estado') === estado && r.params.get('limit') === '1',
      );
      req.flush({
        data: [],
        meta: { total: totales[estado], page: 1, limit: 1, total_pages: totales[estado] },
      });
    }

    expect(resumen).toEqual({ pendienteEntrega: 4, enCamino: 2, entregado: 9 });
  });

  it('gets the detail of an order', () => {
    let codigo = '';
    service.obtener(7).subscribe((d) => (codigo = d.codigo));

    const req = httpMock.expectOne(`${BASE}/7`);
    expect(req.request.method).toBe('GET');
    req.flush(detalleDto());

    expect(codigo).toBe('PED-000007');
  });

  it('puts the order on its way with PATCH en-camino and returns the updated order', () => {
    let estado = '';
    service.marcarEnCamino(7).subscribe((d) => (estado = d.estado));

    const req = httpMock.expectOne(`${BASE}/7/en-camino`);
    expect(req.request.method).toBe('PATCH');
    req.flush(detalleDto({ estado: 'en_camino' }));

    expect(estado).toBe('en_camino');
  });

  it('marks the order as delivered with PATCH entregado and keeps the delivery date', () => {
    let fecha: string | null = null;
    service.marcarEntregado(7).subscribe((d) => (fecha = d.fechaEntrega));

    const req = httpMock.expectOne(`${BASE}/7/entregado`);
    expect(req.request.method).toBe('PATCH');
    req.flush(detalleDto({ estado: 'entregado', fecha_entrega: '2026-11-03T15:00:00.000Z' }));

    expect(fecha).toBe('2026-11-03T15:00:00.000Z');
  });

  it('propagates a 409 when the order changed state', () => {
    let status = 0;
    service.marcarEntregado(7).subscribe({ error: (e: { status: number }) => (status = e.status) });

    httpMock
      .expectOne(`${BASE}/7/entregado`)
      .flush({ message: 'x' }, { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
  });
});
