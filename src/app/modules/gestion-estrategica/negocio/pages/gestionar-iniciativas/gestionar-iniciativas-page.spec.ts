import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { DataTable } from '../../../../../shared/ds/data-table/data-table';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { IniciativaCancelarModal } from '../../components/iniciativa-cancelar-modal/iniciativa-cancelar-modal';
import { IniciativaEliminarModal } from '../../components/iniciativa-eliminar-modal/iniciativa-eliminar-modal';
import { IniciativaEstadoModal } from '../../components/iniciativa-estado-modal/iniciativa-estado-modal';
import { IniciativaFormModal } from '../../components/iniciativa-form-modal/iniciativa-form-modal';
import { Iniciativa } from '../../interfaces/iniciativa.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { IniciativaService } from '../../services/iniciativa.service';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';
import { GestionarIniciativasPage } from './gestionar-iniciativas-page';

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2026,
    anioFin: 2027,
    estadoCodigo: 'BORRADOR',
    estadoNombre: 'Borrador',
    activo: true,
    ...overrides,
  };
}

function makeObjetivo(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 20,
    codigo: 'OE-0020',
    planId: 5,
    nombre: 'Incrementar rentabilidad',
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

function makeIniciativa(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
    id: 10,
    codigo: 'INI-001',
    nombre: 'Programa de fidelización',
    descripcion: null,
    responsable: 'Ana Torres',
    fechaInicio: '2026-01-15',
    fechaFin: '2027-12-20',
    presupuesto: 15000,
    motivoCancelacion: null,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    objetivoId: 20,
    objetivoNombre: 'Incrementar rentabilidad',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    ...overrides,
  };
}

describe('GestionarIniciativasPage', () => {
  const selectedPlan = signal<PlanEstrategico | null>(makePlan());
  const selectedPlanId = signal<number | null>(5);
  const planLoading = signal(false);
  const objetivoService = {
    listarPorPlan: vi.fn((id: number) => {
      void id;
      return of([makeObjetivo()]);
    }),
  };
  const iniciativaService = {
    listarPorPlan: vi.fn((id: number) => {
      void id;
      return of([makeIniciativa()]);
    }),
    crear: vi.fn(() => of(makeIniciativa())),
    actualizar: vi.fn(() => of(makeIniciativa())),
    cambiarEstado: vi.fn(() => of(makeIniciativa())),
    eliminar: vi.fn(() => of(undefined)),
  };
  const planService = {
    planId: selectedPlanId,
    plan: computed(() => selectedPlan()),
    cargando: planLoading,
  };

  beforeEach(() => {
    selectedPlan.set(makePlan());
    selectedPlanId.set(5);
    planLoading.set(false);
    objetivoService.listarPorPlan.mockReset();
    objetivoService.listarPorPlan.mockReturnValue(of([makeObjetivo()]));
    iniciativaService.listarPorPlan.mockReset();
    iniciativaService.listarPorPlan.mockReturnValue(of([makeIniciativa()]));
    iniciativaService.crear.mockClear();
    iniciativaService.actualizar.mockClear();
    iniciativaService.cambiarEstado.mockClear();
    iniciativaService.eliminar.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PlanSeleccionadoService, useValue: planService },
        { provide: ObjetivoEstrategicoService, useValue: objetivoService },
        { provide: IniciativaService, useValue: iniciativaService },
      ],
    });
  });

  function create(): ComponentFixture<GestionarIniciativasPage> {
    const fixture = TestBed.createComponent(GestionarIniciativasPage);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  function actionButtons(fixture: ComponentFixture<GestionarIniciativasPage>): IconButton[] {
    return fixture.debugElement
      .queryAll(By.directive(IconButton))
      .map((item) => item.componentInstance as IconButton);
  }

  it('shows the plan loading state', () => {
    planLoading.set(true);
    expect(create().nativeElement.textContent).toContain('Cargando…');
  });

  it('shows the no-plans state without loading initiatives', () => {
    selectedPlan.set(null);
    selectedPlanId.set(null);
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('No hay planes estratégicos registrados.');
    expect(iniciativaService.listarPorPlan).not.toHaveBeenCalled();
  });

  it('shows loading while both plan requests are pending', () => {
    const objetivos$ = new Subject<ObjetivoEstrategico[]>();
    const iniciativas$ = new Subject<Iniciativa[]>();
    objetivoService.listarPorPlan.mockReturnValue(objetivos$);
    iniciativaService.listarPorPlan.mockReturnValue(iniciativas$);
    const fixture = create();
    expect(fixture.componentInstance.cargando()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando…');
    objetivos$.complete();
    iniciativas$.complete();
  });

  it('shows load error and retry', () => {
    iniciativaService.listarPorPlan.mockReturnValue(throwError(() => new Error('network')));
    const fixture = create();
    expect(fixture.componentInstance.errorCarga()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las iniciativas.');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
  });

  it('shows the no-objectives state', () => {
    objetivoService.listarPorPlan.mockReturnValue(of([]));
    iniciativaService.listarPorPlan.mockReturnValue(of([]));
    expect(create().nativeElement.textContent).toContain(
      'Registra objetivos estratégicos en este plan antes de crear iniciativas.',
    );
  });

  it('shows the no-initiatives state', () => {
    iniciativaService.listarPorPlan.mockReturnValue(of([]));
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('No hay iniciativas aún');
    expect(fixture.nativeElement.textContent).toContain('Nueva iniciativa');
  });

  it('renders the loaded grouped list', () => {
    const fixture = create();
    expect(fixture.debugElement.query(By.directive(DataTable))).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Programa de fidelización');
    expect(fixture.nativeElement.textContent).toContain('OE-0020 · 1 iniciativa');
  });

  it('ignores an old request after the selected plan changes', () => {
    const oldObjectives = new Subject<ObjetivoEstrategico[]>();
    const oldInitiatives = new Subject<Iniciativa[]>();
    objetivoService.listarPorPlan.mockImplementation((id: number) =>
      id === 5
        ? oldObjectives
        : of([makeObjetivo({ id: 30, planId: 6, nombre: 'Objetivo nuevo' })]),
    );
    iniciativaService.listarPorPlan.mockImplementation((id: number) =>
      id === 5
        ? oldInitiatives
        : of([makeIniciativa({ id: 30, objetivoId: 30, nombre: 'Iniciativa nueva' })]),
    );
    const fixture = create();
    selectedPlan.set(makePlan({ id: 6, codigo: 'PE-0006' }));
    selectedPlanId.set(6);
    fixture.detectChanges();
    oldObjectives.next([makeObjetivo({ nombre: 'Objetivo viejo' })]);
    oldObjectives.complete();
    oldInitiatives.next([makeIniciativa({ nombre: 'Iniciativa vieja' })]);
    oldInitiatives.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.iniciativas()[0].nombre).toBe('Iniciativa nueva');
  });

  it('groups by objective, keeps total counts and filters out groups without rows', () => {
    objetivoService.listarPorPlan.mockReturnValue(
      of([makeObjetivo(), makeObjetivo({ id: 21, codigo: 'OE-0021', nombre: 'Ventas' })]),
    );
    iniciativaService.listarPorPlan.mockReturnValue(
      of([
        makeIniciativa(),
        makeIniciativa({
          id: 11,
          codigo: 'INI-002',
          estadoCodigo: 'COMPLETADA',
          estadoNombre: 'Completada',
        }),
        makeIniciativa({ id: 12, codigo: 'INI-003', objetivoId: 21, objetivoNombre: 'Ventas' }),
      ]),
    );
    const component = create().componentInstance;
    expect(component.grupos().map(({ total }) => total)).toEqual([2, 1]);
    expect(component.conteoEstado('PENDIENTE')).toBe(2);
    expect(component.conteoEstado('COMPLETADA')).toBe(1);
    component.seleccionarFiltro('COMPLETADA');
    expect(component.grupos()).toHaveLength(1);
    expect(component.grupos()[0].total).toBe(2);
  });

  it('returns the filter to All when the selected plan changes', () => {
    const fixture = create();
    fixture.componentInstance.seleccionarFiltro('PENDIENTE');
    selectedPlanId.set(6);
    selectedPlan.set(makePlan({ id: 6 }));
    fixture.detectChanges();
    expect(fixture.componentInstance.filtroEstado()).toBeNull();
  });

  it.each([
    ['BORRADOR', 'Borrador', false, 'podrá actualizarse cuando el plan esté Activo'],
    ['ACTIVO', 'Activo', true, 'solo puede actualizarse su estado'],
    ['CERRADO', 'Cerrado', true, 'solo lectura'],
  ] as const)('shows banner and New Initiative state for %s', (code, name, disabled, text) => {
    selectedPlan.set(makePlan({ estadoCodigo: code, estadoNombre: name }));
    const fixture = create();
    const newButton = fixture.debugElement
      .queryAll(By.directive(Button))
      .map((item) => item.componentInstance as Button)
      .find((button) => itemText(button, fixture).includes('Nueva iniciativa'));
    expect(newButton?.disabled()).toBe(disabled);
    expect(fixture.nativeElement.textContent).toContain(text);
  });

  it('applies row action rules for draft, active and closed plans', () => {
    const pending = makeIniciativa();
    const inProgress = makeIniciativa({ estadoCodigo: 'EN_PROCESO', estadoNombre: 'En proceso' });
    const completed = makeIniciativa({ estadoCodigo: 'COMPLETADA', estadoNombre: 'Completada' });
    const cancelled = makeIniciativa({ estadoCodigo: 'CANCELADA', estadoNombre: 'Cancelada' });
    const fixture = create();
    const component = fixture.componentInstance;

    expect(component.puedeEditar(pending)).toBe(true);
    expect(component.puedeEliminar(pending)).toBe(true);
    expect(component.puedeEliminar(inProgress)).toBe(false);
    expect(component.puedeAvanzar(pending)).toBe(false);
    expect(component.puedeCancelarIniciativa(pending)).toBe(false);
    expect(component.puedeEditar(completed)).toBe(false);
    expect(component.puedeEditar(cancelled)).toBe(false);

    selectedPlan.set(makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' }));
    fixture.detectChanges();
    expect(component.puedeAvanzar(pending)).toBe(true);
    expect(component.puedeAvanzar(inProgress)).toBe(true);
    expect(component.puedeCancelarIniciativa(pending)).toBe(true);
    expect(component.puedeCancelarIniciativa(inProgress)).toBe(true);
    expect(component.puedeAvanzar(completed)).toBe(false);
    expect(component.puedeCancelarIniciativa(cancelled)).toBe(false);
    expect(component.puedeEditar(pending)).toBe(false);
    expect(component.puedeEliminar(pending)).toBe(false);

    selectedPlan.set(makePlan({ estadoCodigo: 'CERRADO', estadoNombre: 'Cerrado' }));
    fixture.detectChanges();
    expect(component.puedeAvanzar(pending)).toBe(false);
    expect(component.puedeCancelarIniciativa(pending)).toBe(false);
    expect(component.puedeEditar(pending)).toBe(false);
    expect(component.puedeEliminar(pending)).toBe(false);
    expect(actionButtons(fixture).every((button) => button.disabled())).toBe(true);
  });

  it('renders formatted budgets and cancellation reason tooltip', () => {
    iniciativaService.listarPorPlan.mockReturnValue(
      of([
        makeIniciativa({ presupuesto: 15000 }),
        makeIniciativa({
          id: 11,
          presupuesto: null,
          estadoCodigo: 'CANCELADA',
          estadoNombre: 'Cancelada',
          motivoCancelacion: 'Cambio de prioridad',
        }),
      ]),
    );
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('S/ 15,000');
    expect(fixture.nativeElement.textContent).toContain('—');
    const cancelledBadge = fixture.debugElement
      .queryAll(By.directive(Badge))
      .find((item) => item.nativeElement.textContent.includes('Cancelada'));
    expect(cancelledBadge?.attributes['title']).toBe('Cambio de prioridad');
  });

  it('closes and reloads after each modal success event', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const initialCalls = iniciativaService.listarPorPlan.mock.calls.length;
    component.modalActivo.set('form');
    component.iniciativaSeleccionada.set(makeIniciativa());

    const form = fixture.debugElement.query(By.directive(IniciativaFormModal))
      .componentInstance as IniciativaFormModal;
    const state = fixture.debugElement.query(By.directive(IniciativaEstadoModal))
      .componentInstance as IniciativaEstadoModal;
    const cancel = fixture.debugElement.query(By.directive(IniciativaCancelarModal))
      .componentInstance as IniciativaCancelarModal;
    const remove = fixture.debugElement.query(By.directive(IniciativaEliminarModal))
      .componentInstance as IniciativaEliminarModal;
    form.saved.emit(makeIniciativa());
    state.changed.emit();
    cancel.cancelled.emit();
    remove.deleted.emit();

    expect(component.modalActivo()).toBeNull();
    expect(component.iniciativaSeleccionada()).toBeNull();
    expect(iniciativaService.listarPorPlan).toHaveBeenCalledTimes(initialCalls + 4);
  });
});

function itemText(button: Button, fixture: ComponentFixture<GestionarIniciativasPage>): string {
  const debug = fixture.debugElement
    .queryAll(By.directive(Button))
    .find((item) => item.componentInstance === button);
  return debug?.nativeElement.textContent ?? '';
}
