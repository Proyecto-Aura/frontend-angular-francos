import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { PedidoResumenDto } from '../../mis-pedidos/interfaces/pedido-dto.interface';
import { PedidoHistorial } from '../interfaces/pedido-historial.interface';
import { ClientePedidosService } from './cliente-pedidos.service';

const PEDIDOS_BASE = `${environment.apiUrl}/pedidos`;

function makePedidoDto(overrides: Partial<PedidoResumenDto> = {}): PedidoResumenDto {
  return {
    id: 1,
    codigo: 'PED-000001',
    cliente: { id: 'c1', nombre: 'Ana Vega Torres' },
    metodo_pago: 'efectivo',
    total: 124.8,
    tipo_entrega: 'delivery',
    estado: 'entregado',
    origen: 'manual',
    created_at: '2026-09-09T15:00:00.000Z',
    ...overrides,
  };
}

describe('ClientePedidosService', () => {
  let service: ClientePedidosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientePedidosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('asks only for the delivered orders of the client', () => {
    service.historial('c1').subscribe();

    const req = httpMock.expectOne((r) => r.url === PEDIDOS_BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('cliente_id')).toBe('c1');
    expect(req.request.params.get('estado')).toBe('entregado');
    expect(req.request.params.get('limit')).toBe('100');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
  });

  it('returns the orders from the newest to the oldest', () => {
    let historial: PedidoHistorial[] = [];
    service.historial('c1').subscribe((pedidos) => (historial = pedidos));

    httpMock
      .expectOne((r) => r.url === PEDIDOS_BASE)
      .flush({
        data: [
          makePedidoDto({ id: 1, codigo: 'PED-000001', created_at: '2026-09-01T15:00:00Z' }),
          makePedidoDto({ id: 2, codigo: 'PED-000002', created_at: '2026-09-20T15:00:00Z' }),
        ],
        meta: { total: 2, page: 1, limit: 100, total_pages: 1 },
      });

    expect(historial.map((p) => p.codigo)).toEqual(['PED-000002', 'PED-000001']);
  });

  it('propagates the error of the API', () => {
    let fallo = false;
    service.historial('c1').subscribe({ error: () => (fallo = true) });

    httpMock
      .expectOne((r) => r.url === PEDIDOS_BASE)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(fallo).toBe(true);
  });
});
