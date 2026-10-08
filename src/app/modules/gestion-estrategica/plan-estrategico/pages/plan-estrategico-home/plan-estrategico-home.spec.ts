import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PlanEstrategicoDto } from '../../interfaces/plan-estrategico-dto.interface';
import { PlanEstrategicoHome } from './plan-estrategico-home';

const PLANES_BASE = `${environment.apiUrl}/planes-estrategicos`;

function makePlanDto(overrides: Partial<PlanEstrategicoDto> = {}): PlanEstrategicoDto {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan institucional',
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

describe('PlanEstrategicoHome', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<PlanEstrategicoHome> {
    const fixture = TestBed.createComponent(PlanEstrategicoHome);
    fixture.detectChanges();
    return fixture;
  }

  function expectPageRequest(page: number, limit: number): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.url === PLANES_BASE &&
        request.params.get('page') === String(page) &&
        request.params.get('limit') === String(limit),
    );
  }

  function flushPage(
    req: TestRequest,
    data: PlanEstrategicoDto[] = [],
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = total > 0 ? 1 : 0,
  ): void {
    req.flush({
      data,
      meta: { total, page, limit, total_pages: totalPages },
    });
  }

  it('loads page one and the summary on initialization', () => {
    create();

    const pageReq = expectPageRequest(1, 10);
    const summaryReq = expectPageRequest(1, 100);
    expect(pageReq.request.method).toBe('GET');
    expect(summaryReq.request.method).toBe('GET');
    flushPage(pageReq);
    flushPage(summaryReq, [], 1, 100);
  });

  it('computes the summary counts from the limit-100 response', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushPage(
      expectPageRequest(1, 100),
      [
        makePlanDto(),
        makePlanDto({ id: 2, codigo: 'PE-0002' }),
        makePlanDto({
          id: 3,
          codigo: 'PE-0003',
          estado_plan_id: 2,
          estado_plan: { codigo: 'ACTIVO', nombre: 'Activo' },
        }),
        makePlanDto({
          id: 4,
          codigo: 'PE-0004',
          estado_plan_id: 3,
          estado_plan: { codigo: 'CERRADO', nombre: 'Cerrado' },
        }),
      ],
      1,
      100,
      4,
      1,
    );

    expect(fixture.componentInstance.resumen()).toEqual({
      total: 4,
      borradores: 2,
      activos: 1,
      cerrados: 1,
    });
  });

  it('keeps the summary null when its request fails', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    expectPageRequest(1, 100).flush('error', {
      status: 500,
      statusText: 'Server Error',
    });

    expect(fixture.componentInstance.resumen()).toBeNull();
  });

  it('marks a list-loading error', () => {
    const fixture = create();
    expectPageRequest(1, 10).flush('error', {
      status: 500,
      statusText: 'Server Error',
    });
    flushPage(expectPageRequest(1, 100), [], 1, 100);

    expect(fixture.componentInstance.errorCarga()).toBe(true);
  });

  it('maps each plan state to its badge tone', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10));
    flushPage(expectPageRequest(1, 100), [], 1, 100);

    expect(fixture.componentInstance.tonoEstado('BORRADOR')).toBe('neutral');
    expect(fixture.componentInstance.tonoEstado('ACTIVO')).toBe('success');
    expect(fixture.componentInstance.tonoEstado('CERRADO')).toBe('info');
  });

  it('ignores page changes outside the available range', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makePlanDto()], 1, 10, 21, 3);
    flushPage(expectPageRequest(1, 100), [makePlanDto()], 1, 100, 1, 1);

    fixture.componentInstance.cambiarPagina(0);
    fixture.componentInstance.cambiarPagina(4);
    fixture.componentInstance.cambiarPagina(1);

    httpMock.expectNone(PLANES_BASE);
  });

  it('reloads the previous page when deleting the only row after page one', () => {
    const fixture = create();
    flushPage(expectPageRequest(1, 10), [makePlanDto()], 2, 10, 11, 2);
    flushPage(expectPageRequest(1, 100), [makePlanDto()], 1, 100, 1, 1);

    fixture.componentInstance.planEliminado();

    const previousPageReq = expectPageRequest(1, 10);
    const summaryReq = expectPageRequest(1, 100);
    flushPage(previousPageReq, [], 1, 10, 10, 1);
    flushPage(summaryReq, [], 1, 100);
    expect(fixture.componentInstance.pagina()).toBe(1);
  });
});
