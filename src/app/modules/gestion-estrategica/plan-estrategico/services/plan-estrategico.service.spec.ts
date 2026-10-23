import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { PlanEstrategicoDto } from '../interfaces/plan-estrategico-dto.interface';
import { PlanEstrategicoForm } from '../interfaces/plan-estrategico.interface';
import { PlanEstrategicoService } from './plan-estrategico.service';

const PLANES_BASE = `${environment.apiUrl}/planes-estrategicos`;

function makePlanDto(overrides: Partial<PlanEstrategicoDto> = {}): PlanEstrategicoDto {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan 2025 - 2027',
    descripcion: null,
    anio_inicio: 2025,
    anio_fin: 2027,
    estado_plan_id: 1,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    estado_plan: { codigo: 'BORRADOR', nombre: 'Borrador' },
    ...overrides,
  };
}

function makeForm(overrides: Partial<PlanEstrategicoForm> = {}): PlanEstrategicoForm {
  return {
    nombre: '  Plan institucional  ',
    descripcion: '  Descripción  ',
    anioInicio: '2025',
    anioFin: '2027',
    ...overrides,
  };
}

describe('PlanEstrategicoService', () => {
  let service: PlanEstrategicoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlanEstrategicoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response', () => {
    let result: ReturnType<PlanEstrategicoService['listar']> extends import('rxjs').Observable<
      infer T
    >
      ? T
      : never;
    service.listar(2, 10).subscribe((page) => (result = page));

    const req = httpMock.expectOne(
      (request) =>
        request.url === PLANES_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makePlanDto()],
      meta: { total: 11, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result!).toMatchObject({ total: 11, pagina: 2, totalPaginas: 2 });
    expect(result!.planes[0]).toMatchObject({ codigo: 'PE-0001', anioInicio: 2025 });
  });

  it('lists all plans with a limit of 100 and returns only the plan array', () => {
    let result: unknown;
    service.listarTodos().subscribe((planes) => (result = planes));

    const req = httpMock.expectOne(
      (request) =>
        request.url === PLANES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makePlanDto()],
      meta: { total: 1, page: 1, limit: 100, total_pages: 1 },
    });

    expect(result).toEqual([
      expect.objectContaining({ id: 1, codigo: 'PE-0001', estadoCodigo: 'BORRADOR' }),
    ]);
  });

  it('registers a plan with the mapped create request', () => {
    service.registrar(makeForm({ descripcion: '   ' })).subscribe();

    const req = httpMock.expectOne(PLANES_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Plan institucional',
      anio_inicio: 2025,
      anio_fin: 2027,
    });
    req.flush(makePlanDto());
  });

  it('updates a plan with the mapped update request', () => {
    service.actualizar(7, makeForm({ descripcion: '   ' })).subscribe();

    const req = httpMock.expectOne(`${PLANES_BASE}/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      nombre: 'Plan institucional',
      descripcion: '',
      anio_inicio: 2025,
      anio_fin: 2027,
    });
    req.flush(makePlanDto({ id: 7 }));
  });

  it('activates and closes a plan through their state endpoints', () => {
    service.activar(3).subscribe();
    const activarReq = httpMock.expectOne(`${PLANES_BASE}/3/activar`);
    expect(activarReq.request.method).toBe('PATCH');
    expect(activarReq.request.body).toBeNull();
    activarReq.flush(makePlanDto({ estado_plan: { codigo: 'ACTIVO', nombre: 'Activo' } }));

    service.cerrar(3).subscribe();
    const cerrarReq = httpMock.expectOne(`${PLANES_BASE}/3/cerrar`);
    expect(cerrarReq.request.method).toBe('PATCH');
    expect(cerrarReq.request.body).toBeNull();
    cerrarReq.flush(makePlanDto({ estado_plan: { codigo: 'CERRADO', nombre: 'Cerrado' } }));
  });

  it('deletes a plan by id', () => {
    service.eliminar(9).subscribe();

    const req = httpMock.expectOne(`${PLANES_BASE}/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
