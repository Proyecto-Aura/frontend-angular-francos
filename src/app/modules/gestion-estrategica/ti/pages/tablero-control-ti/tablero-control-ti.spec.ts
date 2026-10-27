import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Iniciativa } from '../../../negocio/interfaces/iniciativa.interface';
import { TableroAnio } from '../../../negocio/interfaces/tablero-control.interface';
import { SeguimientoKpisService } from '../../../negocio/services/seguimiento-kpis.service';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import {
  TableroControlTi,
  TableroKpiFilaTi,
  TableroPerspectivaTi,
} from '../../interfaces/tablero-control-ti.interface';
import { TableroControlTiService } from '../../services/tablero-control-ti.service';
import { TableroControlTiPage } from './tablero-control-ti';

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2026,
    anioFin: 2027,
    estadoCodigo: 'ACTIVO',
    estadoNombre: 'Activo',
    activo: true,
    ...overrides,
  };
}

function makeIniciativa(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
    id: 30,
    codigo: 'INI-001',
    nombre: 'Programa de eficiencia',
    descripcion: null,
    responsable: 'Ana Torres',
    fechaInicio: '2026-01-01',
    fechaFin: '2027-12-31',
    presupuesto: null,
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

function makeAnio(overrides: Partial<TableroAnio> = {}): TableroAnio {
  return {
    anio: 2026,
    meta: 5,
    periodo: { codigo: 'S2', nombre: 'Semestre 2' },
    valor: 4,
    color: 'VERDE',
    ...overrides,
  };
}

function makeFila(overrides: Partial<TableroKpiFilaTi> = {}): TableroKpiFilaTi {
  return {
    kpiId: 10,
    codigo: 'KPI-001',
    nombre: 'Margen operativo',
    formula: 'Utilidad / Ventas',
    unidadSimbolo: 'und',
    frecuenciaNombre: 'Semestral',
    objetivoCodigo: 'OE-001',
    objetivoNombre: 'Incrementar rentabilidad',
    oeNegocio: { id: 100, codigo: 'OE-NEG-001', nombre: 'Mejorar rentabilidad del negocio' },
    responsable: 'Ana Torres',
    iniciativas: [makeIniciativa()],
    anios: [makeAnio(), makeAnio({ anio: 2027, meta: 7, periodo: null, valor: null, color: null })],
    ...overrides,
  };
}

function makePerspectiva(overrides: Partial<TableroPerspectivaTi> = {}): TableroPerspectivaTi {
  return {
    id: 1,
    nombre: 'Financiera',
    orden: 1,
    kpis: [makeFila()],
    ...overrides,
  };
}

function makeTablero(overrides: Partial<TableroControlTi> = {}): TableroControlTi {
  return {
    planId: 5,
    planNombre: 'Plan institucional',
    anioInicio: 2026,
    anioFin: 2027,
    perspectivas: [
      makePerspectiva(),
      makePerspectiva({ id: 2, nombre: 'Cliente', orden: 2, kpis: [] }),
    ],
    ...overrides,
  };
}

function normalizedText(fixture: ComponentFixture<TableroControlTiPage>): string {
  return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
}

describe('TableroControlTiPage', () => {
  const selectedPlan = signal<PlanEstrategico | null>(makePlan());
  const selectedPlanId = signal<number | null>(5);
  const planLoading = signal(false);
  const tableroService = {
    obtener: vi.fn((id: number) => {
      void id;
      return of(makeTablero());
    }),
  };
  const seguimientoService = {
    obtener: vi.fn((id: number) =>
      of({
        planId: id,
        planNombre: `Plan ${id}`,
        cumplimientoGeneral: {
          porcentaje: null,
          evaluados: 0,
          total: 0,
          verde: 0,
          amarillo: 0,
          rojo: 0,
          sinDato: 0,
        },
        perspectivas: [],
      }),
    ),
  };
  const seguimientoFactory = vi.fn(() => seguimientoService);
  const planService = {
    planId: selectedPlanId,
    plan: computed(() => selectedPlan()),
    cargando: planLoading,
  };

  beforeEach(() => {
    selectedPlan.set(makePlan());
    selectedPlanId.set(5);
    planLoading.set(false);
    tableroService.obtener.mockReset();
    tableroService.obtener.mockReturnValue(of(makeTablero()));
    seguimientoService.obtener.mockClear();
    seguimientoFactory.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PlanSeleccionadoService, useValue: planService },
        { provide: TableroControlTiService, useValue: tableroService },
        { provide: SeguimientoKpisService, useFactory: seguimientoFactory },
      ],
    });
  });

  function create(): ComponentFixture<TableroControlTiPage> {
    const fixture = TestBed.createComponent(TableroControlTiPage);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the plan loading state', () => {
    planLoading.set(true);
    expect(normalizedText(create())).toContain('Cargando…');
  });

  it('shows no-plan state without requesting a dashboard', () => {
    selectedPlan.set(null);
    selectedPlanId.set(null);
    const fixture = create();
    expect(normalizedText(fixture)).toContain('No hay planes estratégicos registrados.');
    expect(tableroService.obtener).not.toHaveBeenCalled();
  });

  it('shows load error and retries the request', () => {
    tableroService.obtener.mockReturnValueOnce(throwError(() => new Error('network')));
    const fixture = create();
    expect(normalizedText(fixture)).toContain('No se pudo cargar el tablero de control.');
    expect(normalizedText(fixture)).toContain('Reintentar');

    tableroService.obtener.mockReturnValue(of(makeTablero()));
    const retry = fixture.debugElement.query(By.directive(Button)).componentInstance as Button;
    retry.clicked.emit(new MouseEvent('click'));
    fixture.detectChanges();

    expect(tableroService.obtener).toHaveBeenCalledTimes(2);
    expect(normalizedText(fixture)).toContain('Margen operativo');
  });

  it('shows the empty state for a plan without KPIs', () => {
    tableroService.obtener.mockReturnValue(
      of(makeTablero({ perspectivas: [makePerspectiva({ kpis: [] })] })),
    );
    expect(normalizedText(create())).toContain('Este plan no registra KPIs.');
  });

  it('shows a loaded dashboard', () => {
    const fixture = create();
    const text = normalizedText(fixture);
    expect(fixture.nativeElement.querySelector('h1').textContent.trim()).toBe(
      'Tablero de control de TI',
    );
    expect(text).toContain('Plan institucional · semáforo frente a la meta de cada año');
    expect(text).toContain('Margen operativo');
  });

  it('reloads for a new plan and ignores the old response', () => {
    const oldRequest = new Subject<TableroControlTi>();
    tableroService.obtener.mockImplementation((id: number) =>
      id === 5
        ? oldRequest
        : of(
            makeTablero({
              planId: 6,
              planNombre: 'Plan nuevo',
              perspectivas: [
                makePerspectiva({
                  kpis: [makeFila({ kpiId: 60, nombre: 'KPI nuevo' })],
                }),
              ],
            }),
          ),
    );
    const fixture = create();

    selectedPlan.set(makePlan({ id: 6, nombre: 'Plan nuevo' }));
    selectedPlanId.set(6);
    fixture.detectChanges();
    oldRequest.next(makeTablero({ planNombre: 'Plan viejo' }));
    oldRequest.complete();
    fixture.detectChanges();

    expect(tableroService.obtener).toHaveBeenCalledWith(6);
    expect(fixture.componentInstance.tablero()?.planNombre).toBe('Plan nuevo');
    expect(fixture.componentInstance.filas()[0].nombre).toBe('KPI nuevo');
  });

  it('renders summary cards from the latest value of every KPI', () => {
    tableroService.obtener.mockReturnValue(
      of(
        makeTablero({
          perspectivas: [
            makePerspectiva({
              kpis: [
                makeFila({
                  kpiId: 1,
                  anios: [makeAnio({ anio: 2027, color: 'VERDE' })],
                }),
                makeFila({
                  kpiId: 2,
                  anios: [makeAnio({ anio: 2027, color: 'AMARILLO' })],
                }),
                makeFila({
                  kpiId: 3,
                  anios: [makeAnio({ anio: 2027, color: 'ROJO' })],
                }),
                makeFila({
                  kpiId: 4,
                  anios: [
                    makeAnio({ anio: 2026, color: 'ROJO' }),
                    makeAnio({ anio: 2027, valor: null, color: null }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ),
    );
    const fixture = create();
    const cards = fixture.debugElement
      .queryAll(By.directive(KpiCard))
      .map((debug) => debug.componentInstance as KpiCard);
    expect(cards.map((card) => [card.label(), card.value()])).toEqual([
      ['KPIs del plan', 4],
      ['En verde', 1],
      ['En amarillo', 1],
      ['En rojo', 2],
    ]);
  });

  it('renders one year column per plan year and groups rows by perspective', () => {
    const fixture = create();
    const headers = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLTableCellElement>('th'),
    ).map((element) => element.textContent.trim());
    expect(headers.slice(-2)).toEqual(['2026', '2027']);
    expect(headers).toHaveLength(10);
    expect(fixture.componentInstance.totalColumnas()).toBe(10);
    expect(fixture.componentInstance.anchoMinimoTabla()).toBe('1820px');
    const table = (fixture.nativeElement as HTMLElement).querySelector('table')!;
    expect(table.style.minWidth).toBe('1820px');
    expect(
      Array.from(table.querySelectorAll('td[colspan]')).map((cell) => cell.getAttribute('colspan')),
    ).toEqual(['10', '10', '10']);
    const text = normalizedText(fixture);
    expect(text).toContain('Financiera 1 KPI');
    expect(text).toContain('Cliente 0 KPIs');
    expect(text).toContain('Sin KPIs en esta perspectiva');
  });

  it('renders values, semaphore, period and metas for annual cells', () => {
    tableroService.obtener.mockReturnValue(
      of(
        makeTablero({
          perspectivas: [
            makePerspectiva({
              kpis: [
                makeFila(),
                makeFila({
                  kpiId: 11,
                  nombre: 'Cumplimiento anual',
                  unidadSimbolo: '%',
                  anios: [
                    makeAnio({
                      meta: 10,
                      periodo: { codigo: 'A1', nombre: 'Anual' },
                      valor: 12,
                      color: 'AMARILLO',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ),
    );
    const fixture = create();
    const text = normalizedText(fixture);
    expect(text).toContain('4 und al S2 · meta 5 und Verde');
    expect(text).toContain('— meta 7 und');
    expect(text).toContain('12 % Anual · meta 10 % Amarillo');
    const badges = fixture.debugElement
      .queryAll(By.directive(Badge))
      .map((debug) => debug.nativeElement.textContent.trim());
    expect(badges).toEqual(expect.arrayContaining(['Verde', 'Amarillo']));
  });

  it('renders initiatives with state dots and the empty initiative label', () => {
    const iniciativas = [
      makeIniciativa(),
      makeIniciativa({ id: 31, nombre: 'En ejecución', estadoCodigo: 'EN_PROCESO' }),
      makeIniciativa({ id: 32, nombre: 'Terminada', estadoCodigo: 'COMPLETADA' }),
      makeIniciativa({ id: 33, nombre: 'Cancelada', estadoCodigo: 'CANCELADA' }),
    ];
    tableroService.obtener.mockReturnValue(
      of(
        makeTablero({
          perspectivas: [
            makePerspectiva({
              kpis: [makeFila({ iniciativas }), makeFila({ kpiId: 11, iniciativas: [] })],
            }),
          ],
        }),
      ),
    );
    const fixture = create();
    const text = normalizedText(fixture);
    expect(text).toContain('Programa de eficiencia');
    expect(text).toContain('En ejecución');
    expect(text).toContain('Terminada');
    expect(text).toContain('Cancelada');
    expect(text).toContain('Sin iniciativas');
    const cancelledDot = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLSpanElement>(
        'span.bg-destructive',
      ),
    ).find((element) => element.parentElement?.textContent.includes('Cancelada'));
    expect(cancelledDot).toBeDefined();
  });

  it('returns perspective background, text and point classes for every order', () => {
    const component = create().componentInstance;
    expect([1, 2, 3, 4].map((order) => component.claseFondoPerspectiva(order))).toEqual([
      'bg-success/8',
      'bg-info/7',
      'bg-warning/8',
      'bg-muted-foreground/7',
    ]);
    expect([1, 2, 3, 4].map((order) => component.claseTextoPerspectiva(order))).toEqual([
      'text-[color-mix(in_srgb,var(--color-success)_70%,var(--color-foreground))]',
      'text-[color-mix(in_srgb,var(--color-info)_70%,var(--color-foreground))]',
      'text-[color-mix(in_srgb,var(--color-warning)_70%,var(--color-foreground))]',
      'text-[color-mix(in_srgb,var(--color-muted-foreground)_70%,var(--color-foreground))]',
    ]);
    expect([1, 2, 3, 4].map((order) => component.clasePuntoPerspectiva(order))).toEqual([
      'bg-success',
      'bg-info',
      'bg-warning',
      'bg-muted-foreground',
    ]);
  });

  it('returns initiative point classes for every state', () => {
    const component = create().componentInstance;
    expect(
      ['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'].map((state) =>
        component.clasePuntoIniciativa(state as Iniciativa['estadoCodigo']),
      ),
    ).toEqual(['bg-muted-foreground', 'bg-warning', 'bg-success', 'bg-destructive']);
  });

  it('shows the TI objective and business objective headers in that order', () => {
    const fixture = create();
    const headers = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLTableCellElement>('th'),
    ).map((element) => element.textContent.trim());
    expect(headers.slice(0, 3)).toEqual([
      'Objetivo estratégico de TI',
      'Objetivo de negocio',
      'Indicador',
    ]);
  });

  it('renders the linked business objective name and code in its cell', () => {
    const fixture = create();
    const cell = (fixture.nativeElement as HTMLElement).querySelector(
      'tbody tr:nth-child(2) td:nth-child(2)',
    )!;
    expect(cell.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Mejorar rentabilidad del negocio OE-NEG-001',
    );
    expect(cell.querySelector('app-ds-icon')).not.toBeNull();
  });

  it('renders a dash in the business objective cell when no objective is linked', () => {
    tableroService.obtener.mockReturnValue(
      of(
        makeTablero({ perspectivas: [makePerspectiva({ kpis: [makeFila({ oeNegocio: null })] })] }),
      ),
    );
    const fixture = create();
    const cell = (fixture.nativeElement as HTMLElement).querySelector(
      'tbody tr:nth-child(2) td:nth-child(2)',
    )!;
    expect(cell.textContent.trim()).toBe('—');
    expect(cell.querySelector('app-ds-icon')).toBeNull();
  });

  it('only renders the table without mode buttons and keeps the initiative legend visible', () => {
    const fixture = create();
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    );
    expect(buttons.some((button) => button.textContent.trim() === 'Tabla')).toBe(false);
    expect(buttons.some((button) => button.textContent.trim() === 'Gráficos')).toBe(false);
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tablero-graficos')).toBeNull();
    expect(normalizedText(fixture)).toContain('Iniciativas:');

    tableroService.obtener.mockReturnValue(
      of(makeTablero({ perspectivas: [makePerspectiva({ kpis: [] })] })),
    );
    fixture.componentInstance.cargarTablero();
    fixture.detectChanges();
    expect(normalizedText(fixture)).toContain('Este plan no registra KPIs.');
    expect(normalizedText(fixture)).toContain('Iniciativas:');
  });

  it('does not instantiate tracking services or request KPI tracking when loading or changing plans', () => {
    const fixture = create();
    expect(seguimientoFactory).not.toHaveBeenCalled();
    expect(seguimientoService.obtener).not.toHaveBeenCalled();

    selectedPlan.set(makePlan({ id: 6, nombre: 'Plan nuevo' }));
    selectedPlanId.set(6);
    fixture.detectChanges();

    expect(tableroService.obtener).toHaveBeenCalledWith(6);
    expect(seguimientoFactory).not.toHaveBeenCalled();
    expect(seguimientoService.obtener).not.toHaveBeenCalled();
  });
});
