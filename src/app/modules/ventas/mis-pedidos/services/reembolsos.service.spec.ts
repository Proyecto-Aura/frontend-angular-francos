import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FILTROS_REEMBOLSO_VACIOS, ReembolsoDetalle } from '../interfaces/reembolso.interface';
import { API, page } from '../testing/pedidos.fixtures';
import { makeReembolsoDetalleDto, makeReembolsoResumenDto } from '../testing/reembolsos.fixtures';
import { ReembolsosService } from './reembolsos.service';

describe('ReembolsosService', () => {
  let service: ReembolsosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReembolsosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('listar (RF-A039, RF-A040)', () => {
    it('requests the page with the filters and stores rows and total', () => {
      service.listar({ q: ' quispe ', estado: 'pendiente', fecha: '2026-10-17' }, 2, 10);
      expect(service.cargando()).toBe(true);

      const req = httpMock.expectOne((r) => r.url === `${API}/reembolsos`);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('q')).toBe('quispe');
      expect(req.request.params.get('estado')).toBe('pendiente');
      expect(req.request.params.get('fecha_desde')).toBe('2026-10-17');
      expect(req.request.params.get('fecha_hasta')).toBe('2026-10-17');
      req.flush(
        page(
          [makeReembolsoResumenDto(), makeReembolsoResumenDto({ id: 2, codigo: 'SOL-000002' })],
          12,
        ),
      );

      expect(service.cargando()).toBe(false);
      expect(service.solicitudes().map((r) => r.codigo)).toEqual(['SOL-000001', 'SOL-000002']);
      expect(service.solicitudes()[0]).toMatchObject({
        pedido: 'PED-000004',
        cliente: 'Rosa Elena Quispe Huamán',
        metodoLabel: 'Culqi',
        monto: 1700,
      });
      expect(service.total()).toBe(12);
    });

    it('sends no filter params when there are none', () => {
      service.listar(FILTROS_REEMBOLSO_VACIOS, 1, 10);

      const req = httpMock.expectOne((r) => r.url === `${API}/reembolsos`);
      expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
      req.flush(page([]));
    });

    it('flags the load error when the API fails', () => {
      service.listar(FILTROS_REEMBOLSO_VACIOS, 1, 10);
      httpMock
        .expectOne((r) => r.url === `${API}/reembolsos`)
        .flush(null, { status: 500, statusText: 'Error' });

      expect(service.errorCarga()).toBe(true);
      expect(service.solicitudes()).toEqual([]);
    });
  });

  it('gets a request detail (RF-A041)', () => {
    let detalle: ReembolsoDetalle | undefined;
    service.obtener(1).subscribe((d) => (detalle = d));

    httpMock.expectOne(`${API}/reembolsos/1`).flush(makeReembolsoDetalleDto());

    expect(detalle).toMatchObject({
      codigo: 'SOL-000001',
      motivo: expect.stringContaining('12 packs rotos') as string,
      evidencia: { nombre: 'evidencia-packs-rotos.pdf' },
      motivoRechazo: null,
    });
  });

  it('approves a request (RF-A042)', () => {
    service.aprobar(1).subscribe();

    const req = httpMock.expectOne(`${API}/reembolsos/1/aprobar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(makeReembolsoDetalleDto({ estado: 'aprobado' }));
  });

  it('rejects a request with the reason (RF-A043)', () => {
    service.rechazar(1, 'Fuera del plazo de 48 horas.').subscribe();

    const req = httpMock.expectOne(`${API}/reembolsos/1/rechazar`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ motivo_rechazo: 'Fuera del plazo de 48 horas.' });
    req.flush(makeReembolsoDetalleDto({ estado: 'rechazado' }));
  });

  it('registers the Culqi refund confirmation (RF-A044)', () => {
    service.confirmarDevolucion(1).subscribe();

    const req = httpMock.expectOne(`${API}/reembolsos/1/confirmar-devolucion`);
    expect(req.request.method).toBe('PATCH');
    req.flush(makeReembolsoDetalleDto({ estado: 'reembolsado' }));
  });
});
