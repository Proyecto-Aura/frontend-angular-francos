import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PlanEstrategico } from '../../interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../services/plan-seleccionado.service';
import { PlanSeleccionadoBar } from './plan-seleccionado-bar';

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 1,
    codigo: 'PE-0001',
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

function makeServiceMock() {
  const planes = signal<PlanEstrategico[]>([
    makePlan(),
    makePlan({ id: 2, nombre: 'Plan futuro', estadoCodigo: 'BORRADOR', estadoNombre: 'Borrador' }),
  ]);
  const planId = signal<number | null>(1);

  return {
    planes,
    planId,
    plan: computed(() => planes().find((plan) => plan.id === planId()) ?? null),
    seleccionar: vi.fn((id: number) => planId.set(id)),
  };
}

describe('PlanSeleccionadoBar', () => {
  let planSeleccionado: ReturnType<typeof makeServiceMock>;

  beforeEach(() => {
    planSeleccionado = makeServiceMock();
    TestBed.configureTestingModule({
      providers: [{ provide: PlanSeleccionadoService, useValue: planSeleccionado }],
    });
  });

  it('renders the selected plan name, years, and state', () => {
    const fixture = TestBed.createComponent(PlanSeleccionadoBar);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Plan institucional');
    expect(text).toContain('2026–2028');
    expect(text).toContain('Activo');
  });

  it('selects a plan through its dropdown item', () => {
    const fixture = TestBed.createComponent(PlanSeleccionadoBar);
    fixture.detectChanges();

    fixture.componentInstance.items()[1].onSelect?.();

    expect(planSeleccionado.seleccionar).toHaveBeenCalledWith(2);
  });
});
