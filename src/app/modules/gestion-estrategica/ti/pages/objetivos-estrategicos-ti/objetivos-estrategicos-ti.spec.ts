import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { ObjetivoEstrategico } from '../../../negocio/interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoService } from '../../../negocio/services/objetivo-estrategico.service';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';
import { ObjetivosEstrategicosTiPage } from './objetivos-estrategicos-ti';

const PERSPECTIVAS = [
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

function makeObjetivoTi(overrides: Partial<ObjetivoEstrategicoTi> = {}): ObjetivoEstrategicoTi {
  return {
    id: 1,
    codigo: 'OETI-0001',
    planId: 5,
    nombre: 'Modernizar la infraestructura',
    descripcion: null,
    responsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [],
    oeNegocioId: 100,
    oeNegocio: { id: 100, codigo: 'OE-0100', nombre: 'Incrementar la rentabilidad' },
    ...overrides,
  };
}

function makeObjetivoNegocio(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 100,
    codigo: 'OE-0100',
    planId: 5,
    nombre: 'Incrementar la rentabilidad',
    descripcion: null,
    responsable: 'Gerencia General',
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

describe('ObjetivosEstrategicosTiPage', () => {
  let planSeleccionado: ReturnType<typeof makePlanSeleccionadoMock>;
  let objetivoTiService: { listarPorPlan: ReturnType<typeof vi.fn> };
  let objetivoNegocioService: {
    listarPerspectivas: ReturnType<typeof vi.fn>;
    listarPorPlan: ReturnType<typeof vi.fn>;
  };
  let objetivosTiIniciales: ObjetivoEstrategicoTi[];
  let objetivosNegocioIniciales: ObjetivoEstrategico[];

  beforeEach(() => {
    objetivosTiIniciales = [
      makeObjetivoTi(),
      makeObjetivoTi({
        id: 2,
        codigo: 'OETI-0002',
        nombre: 'Mejorar la experiencia digital',
        perspectivaId: 2,
        perspectivaNombre: 'Clientes',
        perspectivaOrden: 2,
        estadoCodigo: 'EN_PROCESO',
        estadoNombre: 'En proceso',
        oeNegocio: null,
        oeNegocioId: null,
      }),
    ];
    objetivosNegocioIniciales = [makeObjetivoNegocio()];
    planSeleccionado = makePlanSeleccionadoMock();
    objetivoTiService = { listarPorPlan: vi.fn(() => of(objetivosTiIniciales)) };
    objetivoNegocioService = {
      listarPerspectivas: vi.fn(() => of(PERSPECTIVAS)),
      listarPorPlan: vi.fn(() => of(objetivosNegocioIniciales)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PlanSeleccionadoService, useValue: planSeleccionado },
        { provide: ObjetivoEstrategicoTiService, useValue: objetivoTiService },
        { provide: ObjetivoEstrategicoService, useValue: objetivoNegocioService },
      ],
    });
  });

  function create(): ComponentFixture<ObjetivosEstrategicosTiPage> {
    const fixture = TestBed.createComponent(ObjetivosEstrategicosTiPage);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  function setPlan(plan: PlanEstrategico, fixture: ComponentFixture<ObjetivosEstrategicosTiPage>) {
    planSeleccionado.planes.set([plan]);
    planSeleccionado.planId.set(plan.id);
    fixture.detectChanges();
  }

  function findNewButton(
    fixture: ComponentFixture<ObjetivosEstrategicosTiPage>,
  ): Button | undefined {
    return fixture.debugElement
      .queryAll(By.directive(Button))
      .find((button) => button.nativeElement.textContent.includes('Nuevo objetivo'))
      ?.componentInstance as Button | undefined;
  }

  it('loads perspectives, TI objectives, and business objectives on initialization', () => {
    create();

    expect(objetivoNegocioService.listarPerspectivas).toHaveBeenCalledOnce();
    expect(objetivoTiService.listarPorPlan).toHaveBeenCalledWith(5);
    expect(objetivoNegocioService.listarPorPlan).toHaveBeenCalledWith(5);
  });

  it('reloads both objective types on plan change and loads perspectives only once', () => {
    const fixture = create();
    setPlan(makePlan({ id: 6, codigo: 'PE-0006' }), fixture);

    expect(objetivoTiService.listarPorPlan).toHaveBeenLastCalledWith(6);
    expect(objetivoNegocioService.listarPorPlan).toHaveBeenLastCalledWith(6);
    expect(objetivoTiService.listarPorPlan).toHaveBeenCalledTimes(2);
    expect(objetivoNegocioService.listarPorPlan).toHaveBeenCalledTimes(2);
    expect(objetivoNegocioService.listarPerspectivas).toHaveBeenCalledOnce();
  });

  it('resets the perspective filter when the selected plan changes', () => {
    const fixture = create();
    fixture.componentInstance.seleccionarPerspectiva(2);

    setPlan(makePlan({ id: 6 }), fixture);

    expect(fixture.componentInstance.perspectivaSeleccionadaId()).toBeNull();
  });

  it('ignores TI and business objective responses from an old request', () => {
    const tiPlan5 = new Subject<ObjetivoEstrategicoTi[]>();
    const tiPlan6 = new Subject<ObjetivoEstrategicoTi[]>();
    const negocioPlan5 = new Subject<ObjetivoEstrategico[]>();
    const negocioPlan6 = new Subject<ObjetivoEstrategico[]>();
    objetivoTiService.listarPorPlan.mockImplementation((id: number) =>
      id === 5 ? tiPlan5 : tiPlan6,
    );
    objetivoNegocioService.listarPorPlan.mockImplementation((id: number) =>
      id === 5 ? negocioPlan5 : negocioPlan6,
    );
    const fixture = create();

    setPlan(makePlan({ id: 6 }), fixture);
    tiPlan6.next([makeObjetivoTi({ id: 6, planId: 6 })]);
    negocioPlan6.next([makeObjetivoNegocio({ id: 600, planId: 6 })]);
    tiPlan5.next([makeObjetivoTi({ id: 5 })]);
    negocioPlan5.next([makeObjetivoNegocio({ id: 500 })]);

    expect(fixture.componentInstance.objetivos().map(({ id }) => id)).toEqual([6]);
    expect(fixture.componentInstance.objetivosNegocio().map(({ id }) => id)).toEqual([600]);
  });

  it('shows loading and then renders the list', () => {
    const response = new Subject<ObjetivoEstrategicoTi[]>();
    objetivoTiService.listarPorPlan.mockReturnValue(response);
    const fixture = create();

    expect(fixture.componentInstance.cargando()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando…');
    response.next(objetivosTiIniciales);
    response.complete();
    fixture.detectChanges();

    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-ds-data-table')).toBeTruthy();
  });

  it('shows an error with retry and requests data again', () => {
    objetivoTiService.listarPorPlan.mockReturnValueOnce(
      throwError(() => new Error('No se pudo cargar')),
    );
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain(
      'No se pudieron cargar los objetivos de TI.',
    );
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    fixture.componentInstance.cargarDatos();

    expect(objetivoTiService.listarPorPlan).toHaveBeenCalledTimes(2);
  });

  it('keeps the TI table visible and disables create when business objectives fail', () => {
    objetivoNegocioService.listarPorPlan.mockReturnValue(
      throwError(() => new Error('No se pudo cargar Negocio')),
    );
    const fixture = create();

    expect(fixture.componentInstance.errorCarga()).toBe(false);
    expect(fixture.componentInstance.objetivos()).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('app-ds-data-table')).toBeTruthy();
    expect(findNewButton(fixture)?.disabled()).toBe(true);
  });

  it('filters and counts objectives by perspective', () => {
    const component = create().componentInstance;

    expect(component.objetivosFiltrados()).toHaveLength(2);
    expect(component.conteoPerspectiva(1)).toBe(1);
    expect(component.conteoPerspectiva(2)).toBe(1);
    component.seleccionarPerspectiva(2);
    expect(component.objetivosFiltrados().map(({ id }) => id)).toEqual([2]);
  });

  it('computes every empty-state message', () => {
    const component = create().componentInstance;
    component.objetivos.set([]);
    component.objetivosNegocio.set([]);
    expect(component.mensajeVacio()).toBe(
      'Registra objetivos de negocio en este plan antes de crear objetivos de TI.',
    );

    component.objetivosNegocio.set(objetivosNegocioIniciales);
    expect(component.mensajeVacio()).toBe('Crea el primero con "Nuevo objetivo".');

    component.objetivos.set([makeObjetivoTi()]);
    component.seleccionarPerspectiva(2);
    expect(component.mensajeVacio()).toBe('Sin objetivos de TI en la perspectiva Clientes.');

    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    expect(component.mensajeVacio()).toBe('Este plan no registra objetivos de TI.');
  });

  it('computes read-only messages for active and closed plans', () => {
    const component = create().componentInstance;

    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    expect(component.mensajeSoloLectura()).toBe(
      'Este plan está activo. Solo puede actualizarse el estado de los objetivos de TI.',
    );

    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'CERRADO', estadoNombre: 'Cerrado' })]);
    expect(component.mensajeSoloLectura()).toBe(
      'Este plan está cerrado. Los objetivos de TI son de solo lectura.',
    );
  });

  it('disables create without business objectives and prevents opening the modal', () => {
    objetivoNegocioService.listarPorPlan.mockReturnValue(of([]));
    const fixture = create();

    expect(findNewButton(fixture)?.disabled()).toBe(true);
    fixture.componentInstance.abrirNuevoObjetivo();
    expect(fixture.componentInstance.modalActivo()).toBeNull();
  });

  it('enables create, edit, and delete only for a draft plan with business objectives', () => {
    const fixture = create();
    const actionButtons = () =>
      fixture.debugElement
        .queryAll(By.directive(IconButton))
        .map((debugElement) => debugElement.componentInstance as IconButton);

    expect(findNewButton(fixture)?.disabled()).toBe(false);
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
    fixture.componentInstance.abrirNuevoObjetivo();
    expect(fixture.componentInstance.modalActivo()).toBe('form');
    fixture.componentInstance.cerrarModal();

    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    fixture.detectChanges();
    expect(findNewButton(fixture)?.disabled()).toBe(true);
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
    fixture.componentInstance.abrirNuevoObjetivo();
    expect(fixture.componentInstance.modalActivo()).toBeNull();
  });

  it('allows state changes only for non-final objectives in an active plan', () => {
    const component = create().componentInstance;
    const pendiente = makeObjetivoTi();
    const cumplido = makeObjetivoTi({ estadoCodigo: 'CUMPLIDO', estadoNombre: 'Cumplido' });

    expect(component.puedeCambiarEstado(pendiente)).toBe(false);
    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    expect(component.puedeCambiarEstado(pendiente)).toBe(true);
    expect(component.puedeCambiarEstado(cumplido)).toBe(false);
  });

  it('renders linked business objective data and a dash when it is missing', () => {
    const fixture = create();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Incrementar la rentabilidad');
    expect(fixture.nativeElement.textContent).toContain('OE-0100');
    expect(fixture.nativeElement.textContent).toContain('—');
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

  it('opens and closes edit, state, and delete modals with the selected objective', () => {
    const component = create().componentInstance;
    const objetivo = objetivosTiIniciales[0];
    const event = new MouseEvent('click');

    component.abrirEdicion(event, objetivo);
    expect(component.modalActivo()).toBe('form');
    expect(component.objetivoSeleccionado()).toBe(objetivo);
    component.abrirCambioEstado(event, objetivo);
    expect(component.modalActivo()).toBe('estado');
    component.abrirEliminacion(event, objetivo);
    expect(component.modalActivo()).toBe('eliminar');
    component.cerrarModal();
    expect(component.modalActivo()).toBeNull();
    expect(component.objetivoSeleccionado()).toBeNull();
  });

  it('closes modals and reloads both objective lists after saving or deleting', () => {
    const component = create().componentInstance;
    component.modalActivo.set('form');
    component.objetivoSeleccionado.set(objetivosTiIniciales[0]);

    component.objetivoGuardado();
    component.objetivoEliminado();

    expect(component.modalActivo()).toBeNull();
    expect(component.objetivoSeleccionado()).toBeNull();
    expect(objetivoTiService.listarPorPlan).toHaveBeenCalledTimes(3);
    expect(objetivoNegocioService.listarPorPlan).toHaveBeenCalledTimes(3);
  });

  it('shows the no-plan state and does not request objectives', () => {
    planSeleccionado.planes.set([]);
    planSeleccionado.planId.set(null);
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('No hay planes estratégicos registrados.');
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toContain('Ir a Plan estratégico');
    expect(link.getAttribute('href')).toBe('/gestion-estrategica/plan-estrategico');
    expect(objetivoTiService.listarPorPlan).not.toHaveBeenCalled();
    expect(objetivoNegocioService.listarPorPlan).not.toHaveBeenCalled();
  });
});
