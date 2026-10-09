import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { PlanEstrategicoDto } from '../../../plan-estrategico/interfaces/plan-estrategico-dto.interface';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import {
  ObjetivoEstrategicoDto,
  PerspectivaBscDto,
} from '../../interfaces/objetivo-estrategico-dto.interface';
import { MapaEstrategicoPage } from './mapa-estrategico-page';

const API_URL = environment.apiUrl;

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2026,
    anioFin: 2028,
    estadoCodigo: 'ACTIVO',
    estadoNombre: 'Activo',
    activo: true,
    ...overrides,
  };
}

function makePlanDto(overrides: Partial<PlanEstrategicoDto> = {}): PlanEstrategicoDto {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2028,
    estado_plan_id: 2,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    estado_plan: { codigo: 'ACTIVO', nombre: 'Activo' },
    ...overrides,
  };
}

function makePerspectiva(overrides: Partial<PerspectivaBscDto> = {}): PerspectivaBscDto {
  return {
    id: 1,
    nombre: 'Financiera',
    descripcion: null,
    orden: 1,
    ...overrides,
  };
}

function makeObjetivo(overrides: Partial<ObjetivoEstrategicoDto> = {}): ObjetivoEstrategicoDto {
  return {
    id: 1,
    codigo: 'PE-0005-OE-N-001',
    plan_estrategico_id: 5,
    perspectiva_bsc_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Incrementar la rentabilidad',
    descripcion: null,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    perspectiva_bsc: makePerspectiva(),
    estado_objetivo: { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    relaciones_destino_ids: [],
    ...overrides,
  };
}

function makePlanSeleccionadoMock() {
  const planes = signal<PlanEstrategico[]>([makePlan()]);
  const planId = signal<number | null>(5);

  return {
    planes,
    planId,
    plan: computed(() => planes().find((plan) => plan.id === planId()) ?? null),
    cargando: signal(false),
    error: signal(false),
  };
}

describe('MapaEstrategicoPage', () => {
  let httpMock: HttpTestingController;
  let planSeleccionado: ReturnType<typeof makePlanSeleccionadoMock>;

  beforeEach(() => {
    planSeleccionado = makePlanSeleccionadoMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlanSeleccionadoService, useValue: planSeleccionado },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<MapaEstrategicoPage> {
    const fixture = TestBed.createComponent(MapaEstrategicoPage);
    fixture.detectChanges();
    return fixture;
  }

  function expectPerspectivas(): TestRequest {
    const req = httpMock.expectOne(`${API_URL}/perspectivas-bsc`);
    expect(req.request.method).toBe('GET');
    return req;
  }

  function expectObjetivos(planId: number): TestRequest {
    const req = httpMock.expectOne(
      `${API_URL}/planes-estrategicos/${planId}/objetivos-estrategicos`,
    );
    expect(req.request.method).toBe('GET');
    return req;
  }

  function flushPerspectivas(req: TestRequest): void {
    req.flush([
      makePerspectiva(),
      makePerspectiva({ id: 2, nombre: 'Clientes', orden: 2 }),
      makePerspectiva({ id: 3, nombre: 'Procesos internos', orden: 3 }),
      makePerspectiva({ id: 4, nombre: 'Aprendizaje y crecimiento', orden: 4 }),
    ]);
  }

  function flushObjetivos(
    req: TestRequest,
    objetivos: ObjetivoEstrategicoDto[] = [],
    planId = 5,
  ): void {
    req.flush({
      plan: makePlanDto({ id: planId }),
      total_objetivos: objetivos.length,
      perspectivas: [{ perspectiva: makePerspectiva(), objetivos }],
    });
  }

  it('loads perspectives and selected-plan objectives, then reloads after a plan change', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5));

    planSeleccionado.planes.set([makePlan(), makePlan({ id: 6, codigo: 'PE-0006' })]);
    planSeleccionado.planId.set(6);
    fixture.detectChanges();

    flushObjetivos(expectObjetivos(6), [], 6);
    httpMock.expectNone(`${API_URL}/perspectivas-bsc`);
  });

  it('renders objective and drawn-relationship counts in the subtitle', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5), [
      makeObjetivo({ relaciones_destino_ids: [2] }),
      makeObjetivo({
        id: 2,
        codigo: 'PE-0005-OE-N-002',
        nombre: 'Mejorar la satisfacción',
        perspectiva_bsc_id: 2,
        perspectiva_bsc: makePerspectiva({ id: 2, nombre: 'Clientes', orden: 2 }),
      }),
    ]);
    fixture.detectChanges();
    const text = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

    expect(fixture.componentInstance.cantidadRelaciones()).toBe(1);
    expect(text).toContain('2 objetivos · 1 relación ·');
  });

  it('shows the empty message when the selected plan has no objectives', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Este plan no registra objetivos.');
  });

  it('shows a loading error and retries both map requests', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    expectObjetivos(5).flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    const retryButton = (
      Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
    ).find((button) => button.textContent?.includes('Reintentar'));

    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar el mapa.');
    expect(retryButton).toBeTruthy();
    retryButton!.click();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5));
  });

  it('shows the no-plan message and link without requesting objectives', () => {
    planSeleccionado.planes.set([]);
    planSeleccionado.planId.set(null);
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(fixture.nativeElement.textContent).toContain('No hay planes estratégicos registrados.');
    expect(link.getAttribute('href')).toBe('/gestion-estrategica/plan-estrategico');
    httpMock.expectNone(
      (request) =>
        request.url.includes('/planes-estrategicos/') && request.url.includes('/objetivos'),
    );
  });

  it('does not render the selected-plan bar inside the page', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-plan-seleccionado-bar')).toBeNull();
  });

  it('maps every perspective order to its legend-dot class', () => {
    const component = create().componentInstance;
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5));

    expect([1, 2, 3, 4].map((orden) => component.clasePuntoPerspectiva(orden))).toEqual([
      'h-2 w-2 shrink-0 rounded-full bg-success',
      'h-2 w-2 shrink-0 rounded-full bg-info',
      'h-2 w-2 shrink-0 rounded-full bg-warning',
      'h-2 w-2 shrink-0 rounded-full bg-muted-foreground',
    ]);
  });
});
