import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { LoteProductoTerminadoDto } from '../interfaces/lote-producto-terminado-dto.interface';
import { LoteProductoTerminadoService } from './lote-producto-terminado.service';

const LOTES_BASE = `${environment.apiUrl}/lotes-producto-terminado`;

function makeLoteDto(overrides: Partial<LoteProductoTerminadoDto> = {}): LoteProductoTerminadoDto {
  return {
    id: 1,
    producto_terminado_id: 256,
    sku: 'DEMO-MOV-PT-001',
    producto_id: 3,
    producto_nombre: 'Pan de molde',
    categoria_id: 2,
    categoria_nombre: 'Panadería',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    codigo_lote: 'FR-LTP-001-261017-PT256',
    fecha_produccion: '2026-10-17',
    fecha_vencimiento: '2026-12-01',
    cantidad_inicial: 100,
    cantidad_actual: 100,
    estado: 'activo',
    activo: true,
    created_at: '2026-10-17T00:00:00.000Z',
    updated_at: '2026-10-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('LoteProductoTerminadoService', () => {
  let service: LoteProductoTerminadoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoteProductoTerminadoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response, incluyendo fecha_produccion (no fecha_ingreso)', () => {
    let result: ReturnType<
      LoteProductoTerminadoService['listar']
    > extends import('rxjs').Observable<infer T>
      ? T
      : never;
    service
      .listar(2, 10, {
        search: 'DEMO',
        productoTerminadoId: 256,
        estado: 'activo',
        activo: true,
      })
      .subscribe((pagina) => (result = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10' &&
        request.params.get('search') === 'DEMO' &&
        request.params.get('producto_terminado_id') === '256' &&
        request.params.get('estado') === 'activo' &&
        request.params.get('activo') === 'true',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeLoteDto()],
      meta: { total: 3, page: 2, limit: 10, total_pages: 1 },
    });

    expect(result!).toMatchObject({ total: 3, pagina: 2, totalPaginas: 1 });
    expect(result!.lotes[0]).toEqual({
      id: 1,
      productoTerminadoId: 256,
      sku: 'DEMO-MOV-PT-001',
      productoId: 3,
      productoNombre: 'Pan de molde',
      categoriaId: 2,
      categoriaNombre: 'Panadería',
      presentacionId: 2,
      presentacionCantidad: 500,
      presentacionUnidadMedida: 'gr',
      codigoLote: 'FR-LTP-001-261017-PT256',
      fechaProduccion: '2026-10-17',
      fechaVencimiento: '2026-12-01',
      cantidadInicial: 100,
      cantidadActual: 100,
      estado: 'activo',
      activo: true,
    });
  });

  it('omits empty filters from the query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        !request.params.has('search') &&
        !request.params.has('producto_terminado_id') &&
        !request.params.has('estado') &&
        !request.params.has('activo') &&
        !request.params.has('vence_desde') &&
        !request.params.has('vence_hasta'),
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('sends vence_desde/vence_hasta como rango sobre fecha_vencimiento', () => {
    service.listar(1, 10, { venceDesde: '2026-10-01', venceHasta: '2026-10-31' }).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === LOTES_BASE &&
        request.params.get('vence_desde') === '2026-10-01' &&
        request.params.get('vence_hasta') === '2026-10-31',
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });

  it('sends estado=por_vencer (4to estado calculado por el backend al leer)', () => {
    service.listar(1, 10, { estado: 'por_vencer' }).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === LOTES_BASE && request.params.get('estado') === 'por_vencer',
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 10, total_pages: 0 } });
  });
});
