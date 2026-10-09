import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PlanEstrategico } from '../interfaces/plan-estrategico.interface';
import { PlanEstrategicoService } from './plan-estrategico.service';
import { PlanSeleccionadoService } from './plan-seleccionado.service';

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2026,
    anioFin: 2028,
    estadoCodigo: 'BORRADOR',
    estadoNombre: 'Borrador',
    activo: true,
    ...overrides,
  };
}

describe('PlanSeleccionadoService', () => {
  let service: PlanSeleccionadoService;
  let planService: { listarTodos: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    planService = { listarTodos: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: PlanEstrategicoService, useValue: planService }],
    });
    service = TestBed.inject(PlanSeleccionadoService);
  });

  it('selects the active plan by default', () => {
    planService.listarTodos.mockReturnValue(
      of([makePlan(), makePlan({ id: 2, estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]),
    );

    service.cargar();

    expect(service.planId()).toBe(2);
    expect(service.plan()?.estadoCodigo).toBe('ACTIVO');
  });

  it('selects the first draft when there is no active plan', () => {
    planService.listarTodos.mockReturnValue(
      of([
        makePlan({ id: 1, estadoCodigo: 'CERRADO', estadoNombre: 'Cerrado' }),
        makePlan({ id: 2 }),
      ]),
    );

    service.cargar();

    expect(service.planId()).toBe(2);
  });

  it('selects the first plan when there is no active or draft plan', () => {
    planService.listarTodos.mockReturnValue(
      of([
        makePlan({ id: 3, estadoCodigo: 'CERRADO', estadoNombre: 'Cerrado' }),
        makePlan({ id: 4, estadoCodigo: 'CERRADO', estadoNombre: 'Cerrado' }),
      ]),
    );

    service.cargar();

    expect(service.planId()).toBe(3);
  });

  it('sets a null selection for an empty plan list', () => {
    planService.listarTodos.mockReturnValue(of([]));

    service.cargar();

    expect(service.planId()).toBeNull();
    expect(service.plan()).toBeNull();
  });

  it('preserves the current selection while it remains in the list', () => {
    service.seleccionar(2);
    planService.listarTodos.mockReturnValue(
      of([
        makePlan({ id: 1, estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' }),
        makePlan({ id: 2 }),
      ]),
    );

    service.cargar();

    expect(service.planId()).toBe(2);
  });

  it('changes the selection when the current plan is no longer available', () => {
    service.seleccionar(99);
    planService.listarTodos.mockReturnValue(
      of([makePlan({ id: 2, estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]),
    );

    service.cargar();

    expect(service.planId()).toBe(2);
  });

  it('selects a plan explicitly and exposes its computed value', () => {
    planService.listarTodos.mockReturnValue(of([makePlan(), makePlan({ id: 2 })]));
    service.cargar();

    service.seleccionar(2);

    expect(service.planId()).toBe(2);
    expect(service.plan()?.id).toBe(2);
  });

  it('clears its state and marks an error when loading fails', () => {
    service.planes.set([makePlan()]);
    service.seleccionar(1);
    planService.listarTodos.mockReturnValue(throwError(() => new Error('Unable to load plans')));

    service.cargar();

    expect(service.planes()).toEqual([]);
    expect(service.planId()).toBeNull();
    expect(service.error()).toBe(true);
    expect(service.cargando()).toBe(false);
  });
});
