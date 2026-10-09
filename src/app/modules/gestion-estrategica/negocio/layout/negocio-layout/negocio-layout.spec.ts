import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { NegocioLayout } from './negocio-layout';

function makePlan(): PlanEstrategico {
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
    cargar: vi.fn(),
    seleccionar: vi.fn((id: number) => planId.set(id)),
  };
}

describe('NegocioLayout', () => {
  let planSeleccionado: ReturnType<typeof makePlanSeleccionadoMock>;

  beforeEach(() => {
    planSeleccionado = makePlanSeleccionadoMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PlanSeleccionadoService, useValue: planSeleccionado },
      ],
    });
  });

  it('renders the selected-plan bar and a router outlet', () => {
    const fixture = TestBed.createComponent(NegocioLayout);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-plan-seleccionado-bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('loads selected-plan data once on initialization', () => {
    const fixture = TestBed.createComponent(NegocioLayout);
    fixture.detectChanges();
    fixture.detectChanges();

    expect(planSeleccionado.cargar).toHaveBeenCalledOnce();
  });
});
