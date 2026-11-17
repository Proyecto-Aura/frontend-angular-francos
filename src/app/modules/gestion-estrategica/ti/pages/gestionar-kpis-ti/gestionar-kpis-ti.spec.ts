import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { DataTable } from '../../../../../shared/ds/data-table/data-table';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { KpiTiFormModal } from '../../components/kpi-ti-form-modal/kpi-ti-form-modal';
import { CatalogoKpiService } from '../../../negocio/services/catalogo-kpi.service';
import { Kpi } from '../../../negocio/interfaces/kpi.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { KpiTiService } from '../../services/kpi-ti.service';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';
import { GestionarKpisTiPage } from './gestionar-kpis-ti';

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

function makeKpi(overrides: Partial<Kpi> = {}): Kpi {
  return {
    id: 10,
    codigo: 'PE-0005-KPI-TI-001',
    nombre: 'Margen operativo',
    formula: 'Utilidad / Ventas',
    objetivoId: 20,
    objetivoNombre: 'Incrementar rentabilidad',
    objetivoResponsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    frecuenciaId: 2,
    frecuenciaNombre: 'Trimestral',
    unidadId: 3,
    unidadSimbolo: '%',
    metaFinal: 30,
    metas: [
      {
        anio: 2026,
        meta: 25,
        operador: '>=',
        valorAmarillo: 20,
        operadorAmarillo: '>=',
      },
    ],
    ultimoValor: null,
    ...overrides,
  };
}

describe('GestionarKpisTiPage', () => {
  const selectedPlan = signal<PlanEstrategico | null>(makePlan());
  const selectedPlanId = signal<number | null>(5);
  const planLoading = signal(false);
  const objetivoService = {
    listarPorPlan: vi.fn(() => of([makeObjetivoTi()])),
  };
  const kpiService = {
    listarPorPlan: vi.fn(() => of([makeKpi()])),
  };
  const catalogoService = {
    listarFrecuencias: vi.fn(() => of([])),
    listarUnidades: vi.fn(() => of([])),
    listarPeriodos: vi.fn(() => of([])),
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
    kpiService.listarPorPlan.mockReset();
    kpiService.listarPorPlan.mockReturnValue(of([makeKpi()]));
    catalogoService.listarFrecuencias.mockClear();
    catalogoService.listarUnidades.mockClear();
    catalogoService.listarPeriodos.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PlanSeleccionadoService, useValue: planService },
        { provide: ObjetivoEstrategicoTiService, useValue: objetivoService },
        { provide: KpiTiService, useValue: kpiService },
        { provide: CatalogoKpiService, useValue: catalogoService },
      ],
    });
  });

  function create(): ComponentFixture<GestionarKpisTiPage> {
    const fixture = TestBed.createComponent(GestionarKpisTiPage);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  function actionButtons(fixture: ComponentFixture<GestionarKpisTiPage>): IconButton[] {
    return fixture.debugElement
      .queryAll(By.directive(IconButton))
      .map((debug) => debug.componentInstance as IconButton);
  }

  function newKpiButton(fixture: ComponentFixture<GestionarKpisTiPage>): Button {
    const debug = fixture.debugElement
      .queryAll(By.directive(Button))
      .find((item) => item.nativeElement.textContent.trim() === 'Nuevo KPI');
    if (!debug) throw new Error('New KPI button not found');
    return debug.componentInstance as Button;
  }

  it('shows a loading state while both plan requests are pending', () => {
    const objetivos$ = new Subject<ObjetivoEstrategicoTi[]>();
    const kpis$ = new Subject<Kpi[]>();
    objetivoService.listarPorPlan.mockReturnValue(objetivos$);
    kpiService.listarPorPlan.mockReturnValue(kpis$);

    const fixture = create();

    expect(fixture.componentInstance.cargando()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando…');
    objetivos$.next([makeObjetivoTi()]);
    objetivos$.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.cargando()).toBe(true);
    expect(fixture.debugElement.query(By.directive(DataTable))).toBeNull();
    kpis$.next([makeKpi()]);
    kpis$.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.debugElement.query(By.directive(DataTable))).not.toBeNull();
  });

  it('shows the load error state and reloads both requests when retry is clicked', () => {
    kpiService.listarPorPlan.mockReturnValue(throwError(() => new Error('network')));

    const fixture = create();

    expect(fixture.componentInstance.errorCarga()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los KPIs.');
    const retry = fixture.debugElement
      .queryAll(By.directive(Button))
      .find((item) => item.nativeElement.textContent.trim() === 'Reintentar');
    expect(retry).toBeDefined();
    kpiService.listarPorPlan.mockReturnValue(of([makeKpi()]));

    (retry!.componentInstance as Button).clicked.emit(new MouseEvent('click'));
    fixture.detectChanges();

    expect(objetivoService.listarPorPlan).toHaveBeenCalledTimes(2);
    expect(kpiService.listarPorPlan).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.errorCarga()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Margen operativo');
  });

  it('shows the empty state when the plan has objectives but no KPIs', () => {
    kpiService.listarPorPlan.mockReturnValue(of([]));

    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('No hay KPIs aún');
    expect(fixture.nativeElement.textContent).toContain('Crea el primero con "Nuevo KPI".');
  });

  it('shows the loaded KPI list', () => {
    const fixture = create();

    expect(fixture.debugElement.query(By.directive(DataTable))).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Margen operativo');
    expect(fixture.nativeElement.textContent).toContain('PE-0005-KPI-TI-001');
    expect(fixture.nativeElement.textContent).toContain('Incrementar rentabilidad');
    expect(fixture.nativeElement.textContent).toContain('Trimestral');
    expect(fixture.nativeElement.textContent).toContain('30 %');
    expect(fixture.nativeElement.textContent).toContain('Sin registros');
    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('shows draft actions and opens Edit when its row is clicked', () => {
    const fixture = create();
    const buttons = actionButtons(fixture);

    expect(buttons.find((button) => button.label() === 'Registrar valor')?.disabled()).toBe(true);
    expect(buttons.map((button) => button.label())).toEqual([
      'Registrar valor',
      'Editar',
      'Eliminar',
    ]);
    expect(buttons.some((button) => button.label() === 'Ver')).toBe(false);

    const table = fixture.debugElement.query(By.directive(DataTable))
      .componentInstance as DataTable;
    table.rowClicked.emit({ row: makeKpi(), index: 0 });
    fixture.detectChanges();

    const form = fixture.debugElement.query(By.directive(KpiTiFormModal))
      .componentInstance as KpiTiFormModal;
    expect(fixture.componentInstance.modalActivo()).toBe('form');
    expect(form.titulo()).toBe('Editar KPI de TI');
  });

  it('shows enabled register and view actions for an active plan', () => {
    selectedPlan.set(makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' }));

    const fixture = create();
    const buttons = actionButtons(fixture);

    expect(buttons.find((button) => button.label() === 'Registrar valor')?.disabled()).toBe(false);
    expect(buttons.map((button) => button.label())).toEqual(['Registrar valor', 'Ver']);
    expect(buttons.some((button) => button.label() === 'Editar')).toBe(false);
    expect(buttons.some((button) => button.label() === 'Eliminar')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'Este plan está Activo. Los KPIs ya no pueden editarse; solo puede registrarse su valor por periodo.',
    );
  });

  it('shows disabled register and view actions for a closed plan', () => {
    selectedPlan.set(makePlan({ estadoCodigo: 'CERRADO', estadoNombre: 'Cerrado' }));

    const fixture = create();
    const buttons = actionButtons(fixture);

    expect(buttons.find((button) => button.label() === 'Registrar valor')?.disabled()).toBe(true);
    expect(buttons.map((button) => button.label())).toEqual(['Registrar valor', 'Ver']);
    expect(buttons.some((button) => button.label() === 'Editar')).toBe(false);
    expect(buttons.some((button) => button.label() === 'Eliminar')).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(
      'Este plan está Cerrado. Los KPIs son de solo lectura.',
    );
  });

  it('closes the value modal and reloads the list after a value is saved', () => {
    const fixture = create();
    fixture.componentInstance.kpiSeleccionado.set(makeKpi());
    fixture.componentInstance.modalActivo.set('valor');
    const previousCalls = kpiService.listarPorPlan.mock.calls.length;

    fixture.componentInstance.valorGuardado();

    expect(fixture.componentInstance.modalActivo()).toBeNull();
    expect(fixture.componentInstance.kpiSeleccionado()).toBeNull();
    expect(kpiService.listarPorPlan).toHaveBeenCalledTimes(previousCalls + 1);
  });

  it('closes the form modal and reloads the list after a KPI is saved', () => {
    const fixture = create();
    fixture.componentInstance.kpiSeleccionado.set(makeKpi());
    fixture.componentInstance.modalActivo.set('form');
    const previousCalls = kpiService.listarPorPlan.mock.calls.length;

    fixture.componentInstance.kpiGuardado();

    expect(fixture.componentInstance.modalActivo()).toBeNull();
    expect(fixture.componentInstance.kpiSeleccionado()).toBeNull();
    expect(kpiService.listarPorPlan).toHaveBeenCalledTimes(previousCalls + 1);
  });

  it('closes the delete modal and reloads the list after a KPI is deleted', () => {
    const fixture = create();
    fixture.componentInstance.kpiSeleccionado.set(makeKpi());
    fixture.componentInstance.modalActivo.set('eliminar');
    const previousCalls = kpiService.listarPorPlan.mock.calls.length;

    fixture.componentInstance.kpiEliminado();

    expect(fixture.componentInstance.modalActivo()).toBeNull();
    expect(fixture.componentInstance.kpiSeleccionado()).toBeNull();
    expect(kpiService.listarPorPlan).toHaveBeenCalledTimes(previousCalls + 1);
  });

  it('shows the TI title, KPI count and selected plan name', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('KPIs de TI');
    expect(fixture.nativeElement.textContent.replace(/\s+/g, ' ')).toContain(
      '1 KPI en el plan Plan institucional',
    );
    expect(newKpiButton(fixture).disabled()).toBe(false);
    expect(objetivoService.listarPorPlan).toHaveBeenCalledWith(5);
    expect(kpiService.listarPorPlan).toHaveBeenCalledWith(5);
  });

  it('shows the no-plan message and link without requesting data', () => {
    selectedPlan.set(null);
    selectedPlanId.set(null);

    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('No hay planes estratégicos registrados.');
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.textContent).toContain('Ir a Plan estratégico');
    expect(link.getAttribute('href')).toBe('/gestion-estrategica/plan-estrategico');
    expect(objetivoService.listarPorPlan).not.toHaveBeenCalled();
    expect(kpiService.listarPorPlan).not.toHaveBeenCalled();
  });

  it('shows the TI objective empty state and disables creation when there are no objectives', () => {
    objetivoService.listarPorPlan.mockReturnValue(of([]));
    kpiService.listarPorPlan.mockReturnValue(of([]));

    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('No hay objetivos estratégicos de TI');
    expect(fixture.nativeElement.textContent).toContain(
      'Registra objetivos estratégicos de TI en este plan antes de crear KPIs de TI.',
    );
    expect(newKpiButton(fixture).disabled()).toBe(true);
  });

  it.each([
    ['ACTIVO', 'Activo'],
    ['CERRADO', 'Cerrado'],
  ] as const)(
    'disables creation and shows the KPI empty state for %s',
    (estadoCodigo, estadoNombre) => {
      selectedPlan.set(makePlan({ estadoCodigo, estadoNombre }));
      kpiService.listarPorPlan.mockReturnValue(of([]));

      const fixture = create();

      expect(newKpiButton(fixture).disabled()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Este plan no registra KPIs.');
    },
  );

  it.each([
    ['VERDE', 'Verde', 'success'],
    ['AMARILLO', 'Amarillo', 'warning'],
    ['ROJO', 'Rojo', 'danger'],
  ] as const)('renders the latest value and %s traffic light', (color, label, tone) => {
    kpiService.listarPorPlan.mockReturnValue(
      of([
        makeKpi({
          ultimoValor: {
            id: 1,
            anio: 2026,
            periodoId: 4,
            periodoNombre: 'Trimestre 1',
            valor: 24,
            color,
          },
        }),
      ]),
    );

    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('24 %');
    expect(fixture.nativeElement.textContent.replace(/\s+/g, ' ')).toContain('Trimestre 1 2026');
    const badge = fixture.debugElement.query(By.directive(Badge));
    expect(badge.nativeElement.textContent.trim()).toBe(label);
    expect((badge.componentInstance as Badge).tone()).toBe(tone);
  });

  it.each(['success', 'error'] as const)(
    'reloads on plan change and ignores an old %s response',
    (response) => {
      const oldKpis$ = new Subject<Kpi[]>();
      const newKpis$ = new Subject<Kpi[]>();
      kpiService.listarPorPlan.mockReturnValue(oldKpis$);
      const fixture = create();
      const newPlan = makePlan({ id: 6, nombre: 'Plan TI actualizado' });
      const newObjetivo = makeObjetivoTi({ id: 21, planId: 6 });
      const newKpi = makeKpi({ id: 11, nombre: 'Disponibilidad TI', objetivoId: 21 });
      objetivoService.listarPorPlan.mockReturnValue(of([newObjetivo]));
      kpiService.listarPorPlan.mockReturnValue(newKpis$);

      selectedPlan.set(newPlan);
      selectedPlanId.set(6);
      fixture.detectChanges();

      expect(objetivoService.listarPorPlan).toHaveBeenLastCalledWith(6);
      expect(kpiService.listarPorPlan).toHaveBeenLastCalledWith(6);
      expect(objetivoService.listarPorPlan).toHaveBeenCalledTimes(2);
      expect(kpiService.listarPorPlan).toHaveBeenCalledTimes(2);
      if (response === 'success') {
        oldKpis$.next([makeKpi()]);
        oldKpis$.complete();
      } else {
        oldKpis$.error(new Error('Old plan failed'));
      }
      fixture.detectChanges();

      expect(fixture.componentInstance.cargando()).toBe(true);
      expect(fixture.componentInstance.errorCarga()).toBe(false);
      expect(fixture.componentInstance.kpis()).toEqual([]);
      expect(fixture.componentInstance.objetivos()).toEqual([]);

      newKpis$.next([newKpi]);
      newKpis$.complete();
      fixture.detectChanges();

      expect(fixture.componentInstance.cargando()).toBe(false);
      expect(fixture.componentInstance.errorCarga()).toBe(false);
      expect(fixture.componentInstance.kpis()).toEqual([newKpi]);
      expect(fixture.componentInstance.objetivos()).toEqual([newObjetivo]);
      expect(fixture.nativeElement.textContent).toContain('Disponibilidad TI');
      expect(fixture.nativeElement.textContent).not.toContain('Margen operativo');
    },
  );
});
