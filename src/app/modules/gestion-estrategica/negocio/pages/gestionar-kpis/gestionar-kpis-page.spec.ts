import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { DataTable } from '../../../../../shared/ds/data-table/data-table';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { KpiFormModal } from '../../components/kpi-form-modal/kpi-form-modal';
import { CatalogoKpiService } from '../../services/catalogo-kpi.service';
import { Kpi } from '../../interfaces/kpi.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { KpiService } from '../../services/kpi.service';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';
import { GestionarKpisPage } from './gestionar-kpis-page';

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

function makeObjetivo(): ObjetivoEstrategico {
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
  };
}

function makeKpi(): Kpi {
  return {
    id: 10,
    codigo: 'KPI-001',
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
  };
}

describe('GestionarKpisPage', () => {
  const selectedPlan = signal<PlanEstrategico | null>(makePlan());
  const selectedPlanId = signal<number | null>(5);
  const planLoading = signal(false);
  const objetivoService = {
    listarPorPlan: vi.fn(() => of([makeObjetivo()])),
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
    objetivoService.listarPorPlan.mockReturnValue(of([makeObjetivo()]));
    kpiService.listarPorPlan.mockReset();
    kpiService.listarPorPlan.mockReturnValue(of([makeKpi()]));
    catalogoService.listarFrecuencias.mockClear();
    catalogoService.listarUnidades.mockClear();
    catalogoService.listarPeriodos.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PlanSeleccionadoService, useValue: planService },
        { provide: ObjetivoEstrategicoService, useValue: objetivoService },
        { provide: KpiService, useValue: kpiService },
        { provide: CatalogoKpiService, useValue: catalogoService },
      ],
    });
  });

  function create(): ComponentFixture<GestionarKpisPage> {
    const fixture = TestBed.createComponent(GestionarKpisPage);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  function actionButtons(fixture: ComponentFixture<GestionarKpisPage>): IconButton[] {
    return fixture.debugElement
      .queryAll(By.directive(IconButton))
      .map((debug) => debug.componentInstance as IconButton);
  }

  it('shows a loading state while both plan requests are pending', () => {
    const objetivos$ = new Subject<ObjetivoEstrategico[]>();
    const kpis$ = new Subject<Kpi[]>();
    objetivoService.listarPorPlan.mockReturnValue(objetivos$);
    kpiService.listarPorPlan.mockReturnValue(kpis$);

    const fixture = create();

    expect(fixture.componentInstance.cargando()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando…');
    objetivos$.complete();
    kpis$.complete();
  });

  it('shows the load error state', () => {
    kpiService.listarPorPlan.mockReturnValue(throwError(() => new Error('network')));

    const fixture = create();

    expect(fixture.componentInstance.errorCarga()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los KPIs.');
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
    expect(fixture.nativeElement.textContent).toContain('KPI-001');
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

    const form = fixture.debugElement.query(By.directive(KpiFormModal))
      .componentInstance as KpiFormModal;
    expect(fixture.componentInstance.modalActivo()).toBe('form');
    expect(form.titulo()).toBe('Editar KPI');
  });

  it('shows enabled register and view actions for an active plan', () => {
    selectedPlan.set(makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' }));

    const fixture = create();
    const buttons = actionButtons(fixture);

    expect(buttons.find((button) => button.label() === 'Registrar valor')?.disabled()).toBe(false);
    expect(buttons.map((button) => button.label())).toEqual(['Registrar valor', 'Ver']);
    expect(buttons.some((button) => button.label() === 'Editar')).toBe(false);
    expect(buttons.some((button) => button.label() === 'Eliminar')).toBe(false);
  });

  it('shows disabled register and view actions for a closed plan', () => {
    selectedPlan.set(makePlan({ estadoCodigo: 'CERRADO', estadoNombre: 'Cerrado' }));

    const fixture = create();
    const buttons = actionButtons(fixture);

    expect(buttons.find((button) => button.label() === 'Registrar valor')?.disabled()).toBe(true);
    expect(buttons.map((button) => button.label())).toEqual(['Registrar valor', 'Ver']);
    expect(buttons.some((button) => button.label() === 'Editar')).toBe(false);
    expect(buttons.some((button) => button.label() === 'Eliminar')).toBe(false);
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
    fixture.componentInstance.modalActivo.set('form');
    const previousCalls = kpiService.listarPorPlan.mock.calls.length;

    fixture.componentInstance.kpiGuardado();

    expect(fixture.componentInstance.modalActivo()).toBeNull();
    expect(kpiService.listarPorPlan).toHaveBeenCalledTimes(previousCalls + 1);
  });

  it('closes the delete modal and reloads the list after a KPI is deleted', () => {
    const fixture = create();
    fixture.componentInstance.modalActivo.set('eliminar');
    const previousCalls = kpiService.listarPorPlan.mock.calls.length;

    fixture.componentInstance.kpiEliminado();

    expect(fixture.componentInstance.modalActivo()).toBeNull();
    expect(kpiService.listarPorPlan).toHaveBeenCalledTimes(previousCalls + 1);
  });
});
