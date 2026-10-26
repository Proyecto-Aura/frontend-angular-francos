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
import { IniciativaTiCancelarModal } from '../../components/iniciativa-ti-cancelar-modal/iniciativa-ti-cancelar-modal';
import { IniciativaTiEliminarModal } from '../../components/iniciativa-ti-eliminar-modal/iniciativa-ti-eliminar-modal';
import { IniciativaTiEstadoModal } from '../../components/iniciativa-ti-estado-modal/iniciativa-ti-estado-modal';
import { IniciativaTiFormModal } from '../../components/iniciativa-ti-form-modal/iniciativa-ti-form-modal';
import { Iniciativa } from '../../../negocio/interfaces/iniciativa.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { IniciativaTiService } from '../../services/iniciativa-ti.service';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';
import { GestionarIniciativasTiPage } from './gestionar-iniciativas-ti';

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

function makeObjetivoTi(overrides: Partial<ObjetivoEstrategicoTi> = {}): ObjetivoEstrategicoTi {
  return {
    id: 20,
    codigo: 'PE-0005-OE-TI-001',
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
    oeNegocioId: null,
    oeNegocio: null,
    ...overrides,
  };
}

function makeIniciativa(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
    id: 10,
    codigo: 'PE-0005-INI-TI-001',
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

describe('GestionarIniciativasTiPage', () => {
  const selectedPlan = signal<PlanEstrategico | null>(makePlan());
  const selectedPlanId = signal<number | null>(5);
  const planLoading = signal(false);
  const objetivoService = {
    listarPorPlan: vi.fn((id: number) => {
      void id;
      return of([makeObjetivoTi()]);
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
    objetivoService.listarPorPlan.mockReturnValue(of([makeObjetivoTi()]));
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
        { provide: ObjetivoEstrategicoTiService, useValue: objetivoService },
        { provide: IniciativaTiService, useValue: iniciativaService },
      ],
    });
  });

  function create(): ComponentFixture<GestionarIniciativasTiPage> {
    const fixture = TestBed.createComponent(GestionarIniciativasTiPage);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  function actionButtons(fixture: ComponentFixture<GestionarIniciativasTiPage>): IconButton[] {
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
    expect(objetivoService.listarPorPlan).not.toHaveBeenCalled();
  });

  it('shows loading while both plan requests are pending', () => {
    const objetivos$ = new Subject<ObjetivoEstrategicoTi[]>();
    const iniciativas$ = new Subject<Iniciativa[]>();
    objetivoService.listarPorPlan.mockReturnValue(objetivos$);
    iniciativaService.listarPorPlan.mockReturnValue(iniciativas$);
    const fixture = create();
    expect(fixture.componentInstance.cargando()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando…');
    objetivos$.next([makeObjetivoTi()]);
    objetivos$.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.cargando()).toBe(true);
    iniciativas$.next([makeIniciativa()]);
    iniciativas$.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Programa de fidelización');
  });

  it('shows load error and retry', () => {
    iniciativaService.listarPorPlan.mockReturnValue(throwError(() => new Error('network')));
    const fixture = create();
    expect(fixture.componentInstance.errorCarga()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar las iniciativas.');
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    iniciativaService.listarPorPlan.mockReturnValue(of([makeIniciativa()]));
    const retry = fixture.debugElement
      .queryAll(By.directive(Button))
      .find((item) => item.nativeElement.textContent.includes('Reintentar'));
    (retry!.componentInstance as Button).clicked.emit(new MouseEvent('click'));
    fixture.detectChanges();
    expect(objetivoService.listarPorPlan).toHaveBeenCalledTimes(2);
    expect(iniciativaService.listarPorPlan).toHaveBeenCalledTimes(2);
    expect(iniciativaService.listarPorPlan).toHaveBeenLastCalledWith(5);
    expect(fixture.componentInstance.errorCarga()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Programa de fidelización');
  });

  it('shows the no-objectives state', () => {
    objetivoService.listarPorPlan.mockReturnValue(of([]));
    iniciativaService.listarPorPlan.mockReturnValue(of([]));
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain(
      'Registra objetivos estratégicos de TI en este plan antes de crear iniciativas de TI.',
    );
    expect(fixture.nativeElement.textContent).toContain('No hay objetivos estratégicos de TI');
    const newButton = fixture.debugElement
      .queryAll(By.directive(Button))
      .map((item) => item.componentInstance as Button)
      .find((button) => itemText(button, fixture).includes('Nueva iniciativa'));
    expect(newButton?.disabled()).toBe(true);
  });

  it('shows the no-initiatives state', () => {
    iniciativaService.listarPorPlan.mockReturnValue(of([]));
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('No hay iniciativas aún');
    expect(fixture.nativeElement.textContent).toContain('Nueva iniciativa');
  });

  it('renders the loaded grouped list', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Iniciativas de TI');
    expect(fixture.debugElement.query(By.directive(DataTable))).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Programa de fidelización');
    expect(fixture.nativeElement.textContent).toContain('PE-0005-OE-TI-001 · 1 iniciativa');
  });

  it('ignores an old request after the selected plan changes', () => {
    const oldObjectives = new Subject<ObjetivoEstrategicoTi[]>();
    const oldInitiatives = new Subject<Iniciativa[]>();
    objetivoService.listarPorPlan.mockImplementation((id: number) =>
      id === 5
        ? oldObjectives
        : of([makeObjetivoTi({ id: 30, planId: 6, nombre: 'Objetivo nuevo' })]),
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
    oldObjectives.next([makeObjetivoTi({ nombre: 'Objetivo viejo' })]);
    oldObjectives.complete();
    oldInitiatives.next([makeIniciativa({ nombre: 'Iniciativa vieja' })]);
    oldInitiatives.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.iniciativas()[0].nombre).toBe('Iniciativa nueva');
  });

  it('groups by objective, keeps total counts and filters out groups without rows', () => {
    objetivoService.listarPorPlan.mockReturnValue(
      of([
        makeObjetivoTi(),
        makeObjetivoTi({ id: 21, codigo: 'PE-0005-OE-TI-002', nombre: 'Ventas' }),
      ]),
    );
    iniciativaService.listarPorPlan.mockReturnValue(
      of([
        makeIniciativa(),
        makeIniciativa({
          id: 11,
          codigo: 'PE-0005-INI-TI-002',
          estadoCodigo: 'COMPLETADA',
          estadoNombre: 'Completada',
        }),
        makeIniciativa({
          id: 12,
          codigo: 'PE-0005-INI-TI-003',
          objetivoId: 21,
          objetivoNombre: 'Ventas',
        }),
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

  it.each([
    ['BORRADOR', 'PENDIENTE', false, true, false, true],
    ['BORRADOR', 'EN_PROCESO', false, true, false, false],
    ['BORRADOR', 'COMPLETADA', false, false, false, false],
    ['BORRADOR', 'CANCELADA', false, false, false, false],
    ['ACTIVO', 'PENDIENTE', true, false, true, false],
    ['ACTIVO', 'EN_PROCESO', true, false, true, false],
    ['ACTIVO', 'COMPLETADA', false, false, false, false],
    ['ACTIVO', 'CANCELADA', false, false, false, false],
    ['CERRADO', 'PENDIENTE', false, false, false, false],
    ['CERRADO', 'EN_PROCESO', false, false, false, false],
    ['CERRADO', 'COMPLETADA', false, false, false, false],
    ['CERRADO', 'CANCELADA', false, false, false, false],
  ] as const)(
    'applies action rules and labels for plan %s and initiative %s',
    (planState, initiativeState, advance, edit, cancel, remove) => {
      selectedPlan.set(makePlan({ estadoCodigo: planState }));
      const iniciativa = makeIniciativa({ estadoCodigo: initiativeState });
      iniciativaService.listarPorPlan.mockReturnValue(of([iniciativa]));
      const fixture = create();
      const component = fixture.componentInstance;
      expect([
        component.puedeAvanzar(iniciativa),
        component.puedeEditar(iniciativa),
        component.puedeCancelarIniciativa(iniciativa),
        component.puedeEliminar(iniciativa),
      ]).toEqual([advance, edit, cancel, remove]);
      expect(actionButtons(fixture).map((button) => button.disabled())).toEqual([
        !advance,
        !edit,
        !cancel,
        !remove,
      ]);
      expect(actionButtons(fixture).map((button) => button.label())).toEqual([
        advance
          ? initiativeState === 'PENDIENTE'
            ? 'Pasar a En proceso'
            : 'Pasar a Completada'
          : 'El estado solo se actualiza con el plan Activo',
        edit ? 'Editar' : 'Solo se edita con el plan en Borrador',
        cancel
          ? 'Cancelar'
          : 'Solo se cancelan iniciativas pendientes o en proceso con el plan Activo',
        remove
          ? 'Eliminar'
          : planState === 'BORRADOR'
            ? 'Solo se eliminan iniciativas pendientes'
            : 'Solo se elimina con el plan en Borrador',
      ]);
    },
  );

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

  it.each(['form', 'estado', 'cancelar', 'eliminar'] as const)(
    'closes and reloads after the %s modal succeeds',
    (modal) => {
      const fixture = create();
      const component = fixture.componentInstance;
      const initialCalls = iniciativaService.listarPorPlan.mock.calls.length;
      component.modalActivo.set(modal);
      component.iniciativaSeleccionada.set(makeIniciativa());
      component.objetivoIdInicial.set(20);
      fixture.detectChanges();

      const form = fixture.debugElement.query(By.directive(IniciativaTiFormModal))
        .componentInstance as IniciativaTiFormModal;
      const state = fixture.debugElement.query(By.directive(IniciativaTiEstadoModal))
        .componentInstance as IniciativaTiEstadoModal;
      const cancel = fixture.debugElement.query(By.directive(IniciativaTiCancelarModal))
        .componentInstance as IniciativaTiCancelarModal;
      const remove = fixture.debugElement.query(By.directive(IniciativaTiEliminarModal))
        .componentInstance as IniciativaTiEliminarModal;
      const emitSuccess = {
        form: () => form.saved.emit(makeIniciativa()),
        estado: () => state.changed.emit(),
        cancelar: () => cancel.cancelled.emit(),
        eliminar: () => remove.deleted.emit(),
      };
      emitSuccess[modal]();

      expect(component.modalActivo()).toBeNull();
      expect(component.iniciativaSeleccionada()).toBeNull();
      expect(component.objetivoIdInicial()).toBeNull();
      expect(iniciativaService.listarPorPlan).toHaveBeenCalledTimes(initialCalls + 1);
    },
  );
});

function itemText(button: Button, fixture: ComponentFixture<GestionarIniciativasTiPage>): string {
  const debug = fixture.debugElement
    .queryAll(By.directive(Button))
    .find((item) => item.componentInstance === button);
  return debug?.nativeElement.textContent ?? '';
}
