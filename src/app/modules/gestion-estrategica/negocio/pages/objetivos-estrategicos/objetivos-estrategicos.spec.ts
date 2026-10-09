import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import {
  ObjetivoEstrategico,
  PerspectivaBsc,
} from '../../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';
import { ObjetivosEstrategicosPage } from './objetivos-estrategicos';

const PERSPECTIVAS: PerspectivaBsc[] = [
  { id: 1, nombre: 'Financiera', orden: 1 },
  { id: 2, nombre: 'Clientes', orden: 2 },
];

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 5,
    codigo: 'PE-0005',
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

function makeObjetivo(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 1,
    codigo: 'OE-0001',
    planId: 5,
    nombre: 'Incrementar la rentabilidad',
    descripcion: null,
    responsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [],
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
    cargar: vi.fn(),
    seleccionar: vi.fn((id: number) => planId.set(id)),
  };
}

describe('ObjetivosEstrategicosPage', () => {
  let planSeleccionado: ReturnType<typeof makePlanSeleccionadoMock>;
  let objetivoService: {
    listarPerspectivas: ReturnType<typeof vi.fn>;
    listarPorPlan: ReturnType<typeof vi.fn>;
  };
  let objetivosIniciales: ObjetivoEstrategico[];

  beforeEach(() => {
    objetivosIniciales = [
      makeObjetivo(),
      makeObjetivo({
        id: 2,
        codigo: 'OE-0002',
        nombre: 'Mejorar la satisfacción',
        perspectivaId: 2,
        perspectivaNombre: 'Clientes',
        perspectivaOrden: 2,
        estadoCodigo: 'EN_PROCESO',
        estadoNombre: 'En proceso',
      }),
    ];
    planSeleccionado = makePlanSeleccionadoMock();
    objetivoService = {
      listarPerspectivas: vi.fn(() => of(PERSPECTIVAS)),
      listarPorPlan: vi.fn(() => of(objetivosIniciales)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PlanSeleccionadoService, useValue: planSeleccionado },
        { provide: ObjetivoEstrategicoService, useValue: objetivoService },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(ObjetivosEstrategicosPage);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  it('loads perspectives and selected-plan objectives on initialization', () => {
    create();

    expect(planSeleccionado.cargar).toHaveBeenCalledOnce();
    expect(objetivoService.listarPerspectivas).toHaveBeenCalledOnce();
    expect(objetivoService.listarPorPlan).toHaveBeenCalledWith(5);
  });

  it('filters objectives and counts them by perspective', () => {
    const component = create().componentInstance;

    expect(component.objetivosFiltrados()).toHaveLength(2);
    expect(component.conteoPerspectiva(1)).toBe(1);
    expect(component.conteoPerspectiva(2)).toBe(1);
    component.seleccionarPerspectiva(2);
    expect(component.objetivosFiltrados().map(({ id }) => id)).toEqual([2]);
  });

  it('computes empty messages for draft, filtered, and read-only plans', () => {
    const component = create().componentInstance;

    component.objetivos.set([]);
    expect(component.mensajeVacio()).toBe('Crea el primero con "Nuevo objetivo".');

    component.objetivos.set([makeObjetivo()]);
    component.seleccionarPerspectiva(2);
    expect(component.mensajeVacio()).toBe('Sin objetivos en la perspectiva Clientes.');

    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    expect(component.mensajeVacio()).toBe('Este plan no registra objetivos.');
  });

  it('computes read-only messages for active and closed plans', () => {
    const component = create().componentInstance;

    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    expect(component.mensajeSoloLectura()).toBe(
      'Este plan está activo. Solo puede actualizarse el estado de los objetivos.',
    );

    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'CERRADO', estadoNombre: 'Cerrado' })]);
    expect(component.mensajeSoloLectura()).toBe(
      'Este plan está cerrado. Los objetivos son de solo lectura.',
    );
  });

  it('allows state changes only for non-final objectives in an active plan', () => {
    const component = create().componentInstance;
    const pendiente = makeObjetivo();
    const cumplido = makeObjetivo({ estadoCodigo: 'CUMPLIDO', estadoNombre: 'Cumplido' });

    expect(component.puedeCambiarEstado(pendiente)).toBe(false);
    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    expect(component.puedeCambiarEstado(pendiente)).toBe(true);
    expect(component.puedeCambiarEstado(cumplido)).toBe(false);
  });

  it('enables create, edit, and delete only for a draft plan', () => {
    const fixture = create();
    const findNewButton = () => {
      const debugElement = fixture.debugElement
        .queryAll(By.directive(Button))
        .find((button) => button.nativeElement.textContent.includes('Nuevo objetivo'));
      return debugElement?.componentInstance as Button | undefined;
    };
    const actionButtons = () =>
      fixture.debugElement
        .queryAll(By.directive(IconButton))
        .map((debugElement) => debugElement.componentInstance as IconButton);

    expect(findNewButton()?.disabled()).toBe(false);
    expect(
      actionButtons()
        .find((button) => button.label() === 'Editar')
        ?.disabled(),
    ).toBe(false);
    expect(
      actionButtons()
        .find((button) => button.label() === 'Eliminar')
        ?.disabled(),
    ).toBe(false);

    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    fixture.detectChanges();

    expect(findNewButton()?.disabled()).toBe(true);
    expect(
      actionButtons()
        .find((button) => button.label() === 'Editar')
        ?.disabled(),
    ).toBe(true);
    expect(
      actionButtons()
        .find((button) => button.label() === 'Eliminar')
        ?.disabled(),
    ).toBe(true);
  });

  it('maps perspective and objective states to badge tones', () => {
    const component = create().componentInstance;

    expect(component.tonoPerspectiva(1)).toBe('success');
    expect(component.tonoPerspectiva(2)).toBe('info');
    expect(component.tonoPerspectiva(3)).toBe('warning');
    expect(component.tonoPerspectiva(4)).toBe('neutral');
    expect(component.tonoEstado('PENDIENTE')).toBe('neutral');
    expect(component.tonoEstado('EN_PROCESO')).toBe('warning');
    expect(component.tonoEstado('CUMPLIDO')).toBe('success');
    expect(component.tonoEstado('CANCELADO')).toBe('danger');
  });

  it('reloads objectives after saving or deleting one', () => {
    const component = create().componentInstance;
    expect(objetivoService.listarPorPlan).toHaveBeenCalledTimes(1);

    component.objetivoGuardado();
    component.objetivoEliminado();

    expect(objetivoService.listarPorPlan).toHaveBeenCalledTimes(3);
    expect(objetivoService.listarPorPlan).toHaveBeenLastCalledWith(5);
  });
});
