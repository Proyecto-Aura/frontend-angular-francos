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
import { ObjetivoEstrategicoTiDto } from '../../interfaces/objetivo-estrategico-ti-dto.interface';
import { PerspectivaBscDto } from '../../../negocio/interfaces/objetivo-estrategico-dto.interface';
import { PlanEstrategicoDto } from '../../../plan-estrategico/interfaces/plan-estrategico-dto.interface';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { MapaEstrategicoTiPage } from './mapa-estrategico-ti';

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

function makeObjetivoTi(
  overrides: Partial<ObjetivoEstrategicoTiDto> = {},
): ObjetivoEstrategicoTiDto {
  return {
    id: 1,
    codigo: 'PE-0005-OE-TI-001',
    plan_estrategico_id: 5,
    perspectiva_bsc_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Modernizar la plataforma tecnológica',
    descripcion: null,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    perspectiva_bsc: makePerspectiva(),
    estado_objetivo: { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    relaciones_destino_ids: [],
    oe_negocio_id: 10,
    oe_negocio: {
      id: 10,
      codigo: 'PE-0005-OE-N-001',
      nombre: 'Incrementar la rentabilidad',
    },
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

describe('MapaEstrategicoTiPage', () => {
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

  function create(): ComponentFixture<MapaEstrategicoTiPage> {
    const fixture = TestBed.createComponent(MapaEstrategicoTiPage);
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
      `${API_URL}/planes-estrategicos/${planId}/objetivos-estrategicos-ti`,
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
    objetivos: ObjetivoEstrategicoTiDto[] = [],
    planId = 5,
  ): void {
    req.flush({
      plan: makePlanDto({ id: planId }),
      total_objetivos: objetivos.length,
      perspectivas: [{ perspectiva: makePerspectiva(), objetivos }],
    });
  }

  it('loads perspectives and selected-plan TI objectives, then reloads after a plan change', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5));

    planSeleccionado.planes.set([makePlan(), makePlan({ id: 6, codigo: 'PE-0006' })]);
    planSeleccionado.planId.set(6);
    fixture.detectChanges();

    flushObjetivos(expectObjetivos(6), [], 6);
    httpMock.expectNone(`${API_URL}/perspectivas-bsc`);
  });

  it('ignores a stale objective response after the selected plan changes', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    const oldRequest = expectObjetivos(5);

    planSeleccionado.planes.set([makePlan(), makePlan({ id: 6, codigo: 'PE-0006' })]);
    planSeleccionado.planId.set(6);
    fixture.detectChanges();
    const currentRequest = expectObjetivos(6);
    const currentObjective = makeObjetivoTi({
      id: 6,
      codigo: 'PE-0006-OE-TI-001',
      plan_estrategico_id: 6,
      nombre: 'Objetivo vigente',
    });

    flushObjetivos(currentRequest, [currentObjective], 6);
    flushObjetivos(oldRequest, [makeObjetivoTi({ nombre: 'Objetivo obsoleto' })]);

    expect(fixture.componentInstance.objetivos()).toEqual([
      expect.objectContaining({ id: 6, nombre: 'Objetivo vigente' }),
    ]);
  });

  it('renders the title and plural objective and relationship counts', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5), [
      makeObjetivoTi({ relaciones_destino_ids: [2] }),
      makeObjetivoTi({
        id: 2,
        codigo: 'PE-0005-OE-TI-002',
        nombre: 'Mejorar la experiencia digital',
        perspectiva_bsc_id: 2,
        perspectiva_bsc: makePerspectiva({ id: 2, nombre: 'Clientes', orden: 2 }),
      }),
    ]);
    fixture.detectChanges();
    const text = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

    expect(fixture.componentInstance.cantidadRelaciones()).toBe(1);
    expect(text).toContain('Mapa estratégico de TI');
    expect(text).toContain('2 objetivos de TI · 1 relación ·');
  });

  it('renders singular objective and plural relationship counts', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5), [makeObjetivoTi()]);
    fixture.detectChanges();
    const text = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

    expect(fixture.componentInstance.cantidadRelaciones()).toBe(0);
    expect(text).toContain('1 objetivo de TI · 0 relaciones ·');
  });

  it('shows the empty message when the selected plan has no TI objectives', () => {
    const fixture = create();
    flushPerspectivas(expectPerspectivas());
    flushObjetivos(expectObjetivos(5));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Este plan no registra objetivos de TI.');
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
