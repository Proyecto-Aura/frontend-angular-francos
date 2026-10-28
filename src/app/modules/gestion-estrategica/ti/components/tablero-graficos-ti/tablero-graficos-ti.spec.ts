import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { CARGADOR_CHART_JS } from '../../../negocio/chart/chartjs.loader';
import { SeguimientoKpisDto } from '../../../negocio/interfaces/seguimiento-kpis-dto.interface';
import {
  Cumplimiento,
  SeguimientoKpi,
  SeguimientoKpis,
  SeguimientoPerspectiva,
  SeguimientoPunto,
} from '../../../negocio/interfaces/seguimiento-kpis.interface';
import { toSeguimientoKpis } from '../../../negocio/mappers/seguimiento-kpis.mapper';
import { SeguimientoKpisTiService } from '../../services/seguimiento-kpis-ti.service';
import { KpiTendenciaChart } from '../../../negocio/components/kpi-tendencia-chart/kpi-tendencia-chart';
import { TableroGraficosTi } from './tablero-graficos-ti';

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

function normalizedText(fixture: ComponentFixture<TableroGraficosTi>): string {
  return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
}

describe('TableroGraficosTi', () => {
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
        { provide: SeguimientoKpisTiService, useValue: seguimientoService },
        { provide: CARGADOR_CHART_JS, useValue: cargadorFalso },
      ],
    });
  });

  function create(planId = 5): ComponentFixture<TableroGraficosTi> {
    const fixture = TestBed.createComponent(TableroGraficosTi);
    fixture.componentRef.setInput('planId', planId);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  it('loads TI tracking with the received plan id', () => {
    create(9);

    expect(seguimientoService.obtener).toHaveBeenCalledExactlyOnceWith(9);
  });

  it('renders mapped TI tracking without linked business objective text in KPI cards', () => {
    const cumplimiento = {
      porcentaje_promedio: 80,
      kpis_evaluados: 1,
      total_kpis: 1,
      kpis_verde: 1,
      kpis_amarillo: 0,
      kpis_rojo: 0,
      kpis_sin_dato: 0,
    };
    const objetivoTi = {
      id: 20,
      codigo: 'OE-TI-001',
      nombre: 'Asegurar continuidad de TI',
      responsable: 'Ana Torres',
      oe_negocio_id: 100,
      oe_negocio: {
        id: 100,
        codigo: 'OE-NEG-001',
        nombre: 'Mejorar rentabilidad del negocio',
      },
      kpis: [
        {
          id: 10,
          codigo: 'KPI-TI-001',
          nombre: 'Disponibilidad de servicios',
          formula: 'Horas disponibles / Horas totales',
          unidad_medida: { nombre: 'Porcentaje', simbolo: '%' },
          frecuencia: { nombre: 'Semestral' },
          operador: '>=' as const,
          ultimo_valor: {
            anio: 2026,
            periodo: { id: 2, codigo: 'S2', nombre: 'Semestre 2' },
            valor: 8,
            semaforo_color: 'VERDE',
          },
          avance_pct: 80,
          metas_anuales: [{ anio: 2026, meta: 10 }],
          serie: [
            {
              anio: 2026,
              periodo: { id: 2, codigo: 'S2', nombre: 'Semestre 2', numero: 2 },
              valor: 8,
              meta: 10,
              semaforo_color: 'VERDE',
            },
          ],
        },
      ],
    };
    const dto: SeguimientoKpisDto = {
      plan: { id: 5, codigo: 'PE-0005', nombre: 'Plan institucional' },
      cumplimiento_general: cumplimiento,
      perspectivas: [{ id: 1, nombre: 'Financiera', cumplimiento, objetivos: [objetivoTi] }],
    };
    seguimientoService.obtener.mockReturnValue(of(toSeguimientoKpis(dto)));

    const fixture = create();
    const text = normalizedText(fixture);
    expect(text).toContain('Disponibilidad de servicios');
    expect(text).toContain('KPI-TI-001 · Semestral');
    expect(text).toContain('Último · S2 2026 8 %');
    expect(text).toContain('Meta 2026 10 %');
    expect(text).not.toContain(objetivoTi.oe_negocio.nombre);
    expect(text).not.toContain(objetivoTi.oe_negocio.codigo);
    expect(text).not.toContain('Objetivo de negocio');
    const charts = fixture.debugElement.queryAll(By.directive(KpiTendenciaChart));
    expect(charts).toHaveLength(1);
    expect((charts[0].componentInstance as KpiTendenciaChart).descripcion()).toBe(
      'Disponibilidad de servicios: 8 % · 10 %',
    );
  });

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
