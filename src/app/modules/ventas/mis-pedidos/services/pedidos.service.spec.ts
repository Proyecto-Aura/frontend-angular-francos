import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FILTROS_VACIOS } from '../interfaces/pedido.interface';
import {
  API,
  clientesDto,
  makeDetalleDto,
  makeFormValido,
  makeResumenDto,
  page,
  personasDto,
  presentacionesDto,
} from '../testing/pedidos.fixtures';
import { OpcionesRegistro, PedidosService } from './pedidos.service';

describe('PedidosService', () => {
  let service: PedidosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PedidosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('listar (RF-A030, RF-A037)', () => {
    it('requests the page with the filters and stores rows and total', () => {
      service.listar({ ...FILTROS_VACIOS, estado: 'confirmado', desde: '2026-10-01' }, 2, 10);
      expect(service.cargando()).toBe(true);

      const req = httpMock.expectOne((r) => r.url === `${API}/pedidos`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('estado')).toBe('confirmado');
      expect(req.request.params.get('fecha_desde')).toBe('2026-10-01');
      expect(req.request.params.has('origen')).toBe(false);
      req.flush(page([makeResumenDto(), makeResumenDto({ id: 2, codigo: 'PED-000002' })], 12));

      expect(service.cargando()).toBe(false);
      expect(service.pedidos().map((p) => p.codigo)).toEqual(['PED-000001', 'PED-000002']);
      expect(service.total()).toBe(12);
    });

    it('flags the load error when the API fails', () => {
      service.listar(FILTROS_VACIOS, 1, 10);
      httpMock
        .expectOne((r) => r.url === `${API}/pedidos`)
        .flush(null, { status: 500, statusText: 'Error' });

      expect(service.errorCarga()).toBe(true);
      expect(service.pedidos()).toEqual([]);
    });
  });

  it('gets an order detail (RF-A031)', () => {
    let codigo = '';
    service.obtener(7).subscribe((d) => (codigo = d.codigo));

    httpMock.expectOne(`${API}/pedidos/7`).flush(makeDetalleDto({ codigo: 'PED-000007' }));

    expect(codigo).toBe('PED-000007');
  });

  it('registers the order with the Culqi token (RF-A032, RF-A035)', () => {
    service.registrar(makeFormValido({ metodoPago: 'culqi' }), 'tkn_test_1').subscribe();

    const req = httpMock.expectOne(`${API}/pedidos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ metodo_pago: 'culqi', culqi_token: 'tkn_test_1' });
    req.flush(makeDetalleDto());
  });

  it('joins clients, persons and presentations from every page', () => {
    let opciones: OpcionesRegistro | undefined;
    service.opcionesRegistro().subscribe((o) => (opciones = o));

    httpMock
      .expectOne((r) => r.url === `${API}/clientes`)
      .flush(page(clientesDto.slice(0, 2), 3, 2));
    httpMock.expectOne((r) => r.url === `${API}/personas`).flush(page(personasDto));
    httpMock
      .expectOne((r) => r.url === `${API}/producto-presentaciones`)
      .flush(page(presentacionesDto));
    const segunda = httpMock.expectOne(
      (r) => r.url === `${API}/clientes` && r.params.get('page') === '2',
    );
    segunda.flush(page(clientesDto.slice(2)));

    expect(opciones?.clientes).toHaveLength(2);
    expect(opciones?.presentaciones.map((p) => p.id)).toEqual([10, 11]);
  });
});
