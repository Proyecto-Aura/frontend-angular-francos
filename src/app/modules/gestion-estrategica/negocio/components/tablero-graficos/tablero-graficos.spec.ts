import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { CARGADOR_CHART_JS } from '../../chart/chartjs.loader';
import {
  Cumplimiento,
  SeguimientoKpi,
  SeguimientoKpis,
  SeguimientoPerspectiva,
  SeguimientoPunto,
} from '../../interfaces/seguimiento-kpis.interface';
import { SeguimientoKpisService } from '../../services/seguimiento-kpis.service';
import { KpiTendenciaChart } from '../kpi-tendencia-chart/kpi-tendencia-chart';
import { TableroGraficos } from './tablero-graficos';

class FakeChart {
  readonly destroy = vi.fn();
}

function cargadorFalso(): Promise<typeof FakeChart> {
  return Promise.resolve(FakeChart);
}

function makeCumplimiento(overrides: Partial<Cumplimiento> = {}): Cumplimiento {
  return {
    porcentaje: 85,
    evaluados: 3,
    total: 5,
    verde: 1,
    amarillo: 1,
    rojo: 1,
    sinDato: 2,
    ...overrides,
  };
}

function makePunto(overrides: Partial<SeguimientoPunto> = {}): SeguimientoPunto {
  return {
    anio: 2026,
    periodoCodigo: 'S2',
    periodoNombre: 'Semestre 2',
    valor: 8,
    meta: 10,
    color: 'VERDE',
    ...overrides,
  };
}

function makeKpi(overrides: Partial<SeguimientoKpi> = {}): SeguimientoKpi {
  return {
    kpiId: 10,
    codigo: 'KPI-001',
    nombre: 'Margen operativo',
    frecuenciaNombre: 'Semestral',
    unidadSimbolo: '%',
    operador: '>=',
    avancePct: 80,
    ultimoValor: {
      anio: 2026,
      periodoCodigo: 'S2',
      periodoNombre: 'Semestre 2',
      valor: 8,
      color: 'VERDE',
    },
    metaUltimoAnio: 10,
    serie: [makePunto()],
    ...overrides,
  };
}

function makePerspectiva(overrides: Partial<SeguimientoPerspectiva> = {}): SeguimientoPerspectiva {
  return {
    id: 1,
    nombre: 'Financiera',
    orden: 1,
    cumplimiento: makeCumplimiento(),
    kpis: [makeKpi()],
    ...overrides,
  };
}

function makeSeguimiento(overrides: Partial<SeguimientoKpis> = {}): SeguimientoKpis {
  return {
    planId: 5,
    planNombre: 'Plan institucional',
    cumplimientoGeneral: makeCumplimiento({ porcentaje: 87 }),
    perspectivas: [
      makePerspectiva(),
      makePerspectiva({
        id: 2,
        nombre: 'Cliente',
        orden: 2,
        cumplimiento: makeCumplimiento({ porcentaje: null }),
        kpis: [],
      }),
    ],
    ...overrides,
  };
}

function normalizedText(fixture: ComponentFixture<TableroGraficos>): string {
  return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
}

describe('TableroGraficos', () => {
  const seguimientoService = {
    obtener: vi.fn((id: number) => {
      void id;
      return of(makeSeguimiento());
    }),
  };

  beforeEach(() => {
    seguimientoService.obtener.mockReset();
    seguimientoService.obtener.mockReturnValue(of(makeSeguimiento()));
    TestBed.configureTestingModule({
      providers: [
        { provide: SeguimientoKpisService, useValue: seguimientoService },
        { provide: CARGADOR_CHART_JS, useValue: cargadorFalso },
      ],
    });
  });

  function create(planId = 5): ComponentFixture<TableroGraficos> {
    const fixture = TestBed.createComponent(TableroGraficos);
    fixture.componentRef.setInput('planId', planId);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  it('shows loading while the request is pending', () => {
    const request = new Subject<SeguimientoKpis>();
    seguimientoService.obtener.mockReturnValue(request);
    const fixture = create();
    expect(fixture.componentInstance.cargando()).toBe(true);
    expect(normalizedText(fixture)).toContain('Cargando…');
  });

  it('shows an error and retries the request', () => {
    seguimientoService.obtener.mockReturnValueOnce(throwError(() => new Error('network')));
    const fixture = create();
    expect(normalizedText(fixture)).toContain('No se pudieron cargar los gráficos.');
    expect(normalizedText(fixture)).toContain('Reintentar');

    seguimientoService.obtener.mockReturnValue(of(makeSeguimiento()));
    const retry = fixture.debugElement.query(By.directive(Button)).componentInstance as Button;
    retry.clicked.emit(new MouseEvent('click'));
    fixture.detectChanges();
    expect(seguimientoService.obtener).toHaveBeenCalledTimes(2);
    expect(normalizedText(fixture)).toContain('Cumplimiento por perspectiva');
  });

  it('shows an empty state when no perspective has KPIs', () => {
    seguimientoService.obtener.mockReturnValue(
      of(
        makeSeguimiento({
          perspectivas: [makePerspectiva({ kpis: [] })],
        }),
      ),
    );
    expect(normalizedText(create())).toContain('Este plan no registra KPIs.');
  });

  it('shows loaded compliance and trend sections', () => {
    const text = normalizedText(create());
    expect(text).toContain('Cumplimiento por perspectiva');
    expect(text).toContain('Tendencia por KPI');
    expect(text).toContain('Margen operativo');
  });

  it('reloads when planId changes and ignores an old response', () => {
    const oldRequest = new Subject<SeguimientoKpis>();
    seguimientoService.obtener.mockImplementation((id: number) =>
      id === 5 ? oldRequest : of(makeSeguimiento({ planId: 6, planNombre: 'Plan nuevo' })),
    );
    const fixture = create();
    fixture.componentRef.setInput('planId', 6);
    fixture.detectChanges();
    oldRequest.next(makeSeguimiento({ planNombre: 'Plan viejo' }));
    oldRequest.complete();
    fixture.detectChanges();

    expect(seguimientoService.obtener).toHaveBeenCalledWith(6);
    expect(fixture.componentInstance.datos()?.planNombre).toBe('Plan nuevo');
  });

  it('renders compliance percentages, capped widths, classes and all counts', () => {
    seguimientoService.obtener.mockReturnValue(
      of(
        makeSeguimiento({
          perspectivas: [
            makePerspectiva({
              cumplimiento: makeCumplimiento({ porcentaje: 85 }),
            }),
            makePerspectiva({
              id: 2,
              nombre: 'Cliente',
              orden: 2,
              cumplimiento: makeCumplimiento({ porcentaje: null }),
              kpis: [],
            }),
            makePerspectiva({
              id: 3,
              nombre: 'Procesos',
              orden: 3,
              cumplimiento: makeCumplimiento({ porcentaje: 120 }),
              kpis: [],
            }),
          ],
        }),
      ),
    );
    const fixture = create();
    const text = normalizedText(fixture);
    expect(text).toContain('87% cumplimiento general');
    expect(text).toContain('Financiera 85%');
    expect(text).toContain('Cliente —');
    expect(text).toContain('1 verde');
    expect(text).toContain('1 amarillo');
    expect(text).toContain('1 rojo');
    expect(text).toContain('2 sin dato');

    const fills = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '[role="progressbar"] > div',
      ),
    );
    expect(fills.map((element) => element.style.width)).toEqual(['85%', '0%', '100%']);
    expect(fills[0].classList.contains('bg-warning')).toBe(true);
    expect(fills[1].classList.contains('bg-muted-foreground')).toBe(true);
    expect(fills[2].classList.contains('bg-success')).toBe(true);
  });

  it('renders KPI cards in backend order with semaphore badges', () => {
    seguimientoService.obtener.mockReturnValue(
      of(
        makeSeguimiento({
          perspectivas: [
            makePerspectiva({
              kpis: [
                makeKpi(),
                makeKpi({
                  kpiId: 11,
                  codigo: 'KPI-002',
                  nombre: 'Costos',
                  ultimoValor: {
                    ...makeKpi().ultimoValor!,
                    color: 'AMARILLO',
                  },
                }),
              ],
            }),
            makePerspectiva({
              id: 2,
              nombre: 'Cliente',
              orden: 2,
              kpis: [
                makeKpi({
                  kpiId: 12,
                  codigo: 'KPI-003',
                  nombre: 'Satisfacción',
                  ultimoValor: { ...makeKpi().ultimoValor!, color: 'ROJO' },
                }),
                makeKpi({
                  kpiId: 13,
                  codigo: 'KPI-004',
                  nombre: 'Reclamos',
                  ultimoValor: null,
                  metaUltimoAnio: null,
                  avancePct: null,
                  serie: [makePunto({ valor: null, color: null })],
                }),
              ],
            }),
          ],
        }),
      ),
    );
    const fixture = create();
    const text = normalizedText(fixture);
    expect(text.indexOf('Margen operativo')).toBeLessThan(text.indexOf('Costos'));
    expect(text.indexOf('Costos')).toBeLessThan(text.indexOf('Satisfacción'));
    expect(text).toContain('KPI-001 · Semestral');
    const badges = fixture.debugElement
      .queryAll(By.directive(Badge))
      .map((debug) => debug.nativeElement.textContent.trim());
    expect(badges).toEqual(['Verde', 'Amarillo', 'Rojo', 'Sin dato']);
  });

  it('renders KPI figures, chart descriptions and the custom legend', () => {
    seguimientoService.obtener.mockReturnValue(
      of(
        makeSeguimiento({
          perspectivas: [
            makePerspectiva({
              kpis: [
                makeKpi(),
                makeKpi({
                  kpiId: 11,
                  nombre: 'KPI sin datos',
                  ultimoValor: null,
                  metaUltimoAnio: null,
                  avancePct: null,
                  serie: [makePunto({ valor: null, color: null })],
                }),
              ],
            }),
          ],
        }),
      ),
    );
    const fixture = create();
    const text = normalizedText(fixture);
    expect(text).toContain('Último · S2 2026 8 %');
    expect(text).toContain('Meta 2026 10 %');
    expect(text).toContain('Cumplimiento 80%');
    expect(text).toContain('Último valor —');
    expect(text).toContain('Meta —');
    expect(text).toContain('Cumplimiento —');
    expect(text).toContain('Valor registrado');
    expect(text).toContain('Meta del año');

    const charts = fixture.debugElement
      .queryAll(By.directive(KpiTendenciaChart))
      .map((debug) => debug.componentInstance as KpiTendenciaChart);
    expect(charts.map((chart) => chart.descripcion())).toEqual([
      'Margen operativo: 8 % · 10 %',
      'KPI sin datos: — · —',
    ]);
  });
});
