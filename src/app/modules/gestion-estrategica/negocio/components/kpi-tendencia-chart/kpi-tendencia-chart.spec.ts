import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeguimientoPunto } from '../../interfaces/seguimiento-kpis.interface';
import { KpiTendenciaChart } from './kpi-tendencia-chart';

interface ChartConfig {
  type: string;
  data: {
    labels: string[][];
    datasets: Record<string, unknown>[];
  };
  options: {
    scales: {
      y: {
        beginAtZero: boolean;
        ticks: { callback: (value: number | string) => string };
      };
    };
    plugins: {
      tooltip: {
        filter: (item: { datasetIndex: number }) => boolean;
        callbacks: {
          title: (items: { dataIndex: number }[]) => string;
          label: (context: { dataIndex: number }) => string;
        };
      };
    };
  };
}

const chartModuleState = vi.hoisted(() => {
  let resolveModule!: (module: unknown) => void;
  const modulePromise = new Promise<unknown>((resolve) => {
    resolveModule = resolve;
  });
  return {
    modulePromise,
    resolveModule: (module: unknown) => resolveModule(module),
    loads: 0,
  };
});

vi.mock('chart.js', async () => {
  chartModuleState.loads += 1;
  return chartModuleState.modulePromise;
});

const chartInstances: FakeChart[] = [];

class FakeChart {
  static readonly register = vi.fn();
  readonly destroy = vi.fn();

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly config: unknown,
  ) {
    chartInstances.push(this);
  }
}

class FakeChartPart {}

function fakeChartModule() {
  return {
    Chart: FakeChart,
    CategoryScale: FakeChartPart,
    LineController: FakeChartPart,
    LineElement: FakeChartPart,
    LinearScale: FakeChartPart,
    PointElement: FakeChartPart,
    Tooltip: FakeChartPart,
  };
}

function makePunto(overrides: Partial<SeguimientoPunto> = {}): SeguimientoPunto {
  return {
    anio: 2026,
    periodoCodigo: 'T1',
    periodoNombre: 'Trimestre 1',
    valor: 8,
    meta: 10,
    color: 'VERDE',
    ...overrides,
  };
}

function ultimaInstancia(): FakeChart {
  return chartInstances.at(-1) as FakeChart;
}

function ultimaConfiguracion(): ChartConfig {
  return ultimaInstancia().config as ChartConfig;
}

describe('KpiTendenciaChart', () => {
  beforeEach(() => {
    chartInstances.length = 0;
    const tokens: Record<string, string> = {
      '--color-primary': 'crimson',
      '--color-muted-foreground': 'gray',
      '--color-border': 'silver',
      '--color-card': 'white',
      '--color-success': 'green',
      '--color-warning': 'orange',
      '--color-destructive': 'red',
    };
    for (const [token, value] of Object.entries(tokens)) {
      document.documentElement.style.setProperty(token, value);
    }
    TestBed.configureTestingModule({});
  });

  async function create(
    serie: SeguimientoPunto[],
    unidad = '%',
    descripcion = 'Margen: 8 % · 10 %',
  ): Promise<ComponentFixture<KpiTendenciaChart>> {
    const fixture = TestBed.createComponent(KpiTendenciaChart);
    fixture.componentRef.setInput('serie', serie);
    fixture.componentRef.setInput('unidadSimbolo', unidad);
    fixture.componentRef.setInput('descripcion', descripcion);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    if (serie.some((punto) => punto.valor !== null)) {
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(chartInstances.length).toBeGreaterThan(0);
      });
    }
    return fixture;
  }

  it('shows empty state without a canvas or loading Chart.js when all values are null', async () => {
    const fixture = await create([makePunto({ valor: null }), makePunto({ valor: null })]);
    expect(fixture.nativeElement.textContent).toContain('Sin registros de valor');
    expect(fixture.nativeElement.querySelector('canvas')).toBeNull();
    expect(chartModuleState.loads).toBe(0);
  });

  it('does not create a chart when loading resolves after component destruction', async () => {
    const fixture = TestBed.createComponent(KpiTendenciaChart);
    fixture.componentRef.setInput('serie', [makePunto()]);
    fixture.componentRef.setInput('unidadSimbolo', '%');
    fixture.componentRef.setInput('descripcion', 'Descripción');
    fixture.detectChanges();
    await Promise.resolve();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(chartModuleState.loads).toBe(1);
    });
    fixture.destroy();
    chartModuleState.resolveModule(fakeChartModule());
    await vi.waitFor(() => expect(FakeChart.register).toHaveBeenCalledTimes(1));
    expect(chartInstances).toHaveLength(0);
  });

  it('creates an accessible canvas and one chart for a series with values', async () => {
    const fixture = await create([makePunto()], '%', 'Descripción accesible');
    const canvas = fixture.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Descripción accesible');
    expect(chartInstances).toHaveLength(1);
  });

  it('configures line datasets, nulls, point colors and the regular point radius', async () => {
    await create([
      makePunto({ color: 'VERDE', valor: 8, meta: 10 }),
      makePunto({ periodoCodigo: 'T2', color: 'AMARILLO', valor: null, meta: 11 }),
      makePunto({ periodoCodigo: 'T3', color: 'ROJO', valor: 7, meta: null }),
      makePunto({ periodoCodigo: 'T4', color: null, valor: 9, meta: 12 }),
    ]);
    const config = ultimaConfiguracion();
    expect(config.type).toBe('line');
    expect(config.data.datasets).toHaveLength(2);
    expect(config.data.datasets[0]).toMatchObject({
      label: 'Meta del año',
      data: [10, 11, null, 12],
      borderDash: [6, 4],
      stepped: 'middle',
      pointRadius: 0,
    });
    expect(config.data.datasets[1]).toMatchObject({
      label: 'Valor registrado',
      data: [8, null, 7, 9],
      spanGaps: true,
      pointRadius: 4.5,
      pointBackgroundColor: ['green', 'orange', 'red', 'gray'],
    });
  });

  it('uses a smaller point radius for more than twelve points', async () => {
    await create(
      Array.from({ length: 13 }, (_, index) =>
        makePunto({ periodoCodigo: `M${index + 1}`, periodoNombre: `Mes ${index + 1}` }),
      ),
    );
    expect(ultimaConfiguracion().data.datasets[1]['pointRadius']).toBe(3.5);
  });

  it.each([
    [
      [
        makePunto({ periodoCodigo: 'M1', periodoNombre: 'Enero' }),
        makePunto({ periodoCodigo: 'M2', periodoNombre: 'Febrero' }),
      ],
      [['Ene', '2026'], ['Feb']],
    ],
    [
      [makePunto({ periodoCodigo: 'T1' }), makePunto({ periodoCodigo: 'T2' })],
      [['T1', '2026'], ['T2']],
    ],
    [
      [
        makePunto({ periodoCodigo: 'A1', periodoNombre: 'Anual' }),
        makePunto({ anio: 2027, periodoCodigo: 'A1', periodoNombre: 'Anual' }),
      ],
      [['2026'], ['2027']],
    ],
  ] as const)('builds chart labels for frequency %#', async (serie, expected) => {
    await create([...serie]);
    expect(ultimaConfiguracion().data.labels).toEqual(expected);
  });

  it('formats tooltip title and labels and filters the target dataset', async () => {
    await create([
      makePunto({ valor: 8, meta: 10 }),
      makePunto({ periodoCodigo: 'T2', valor: 7, meta: null }),
      makePunto({ periodoCodigo: 'T3', valor: null, meta: 12 }),
    ]);
    const tooltip = ultimaConfiguracion().options.plugins.tooltip;
    expect(tooltip.filter({ datasetIndex: 0 })).toBe(false);
    expect(tooltip.filter({ datasetIndex: 1 })).toBe(true);
    expect(tooltip.callbacks.title([{ dataIndex: 0 }])).toBe('T1 2026');
    expect(tooltip.callbacks.label({ dataIndex: 0 })).toBe('8 % · meta 10 %');
    expect(tooltip.callbacks.label({ dataIndex: 1 })).toBe('7 %');
    expect(tooltip.callbacks.label({ dataIndex: 2 })).toBe('Sin valor');
  });

  it('starts the Y axis at zero and formats ticks with the unit', async () => {
    await create([makePunto()], 'S/');
    const y = ultimaConfiguracion().options.scales.y;
    expect(y.beginAtZero).toBe(true);
    expect(y.ticks.callback(12_000)).toBe('S/ 12k');
  });

  it('destroys and recreates the chart when the series changes', async () => {
    const fixture = await create([makePunto()]);
    const first = ultimaInstancia();
    fixture.componentRef.setInput('serie', [makePunto({ valor: 9 })]);
    fixture.detectChanges();
    await vi.waitFor(() => expect(chartInstances).toHaveLength(2));
    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(chartInstances).toHaveLength(2);
  });

  it('destroys the current chart with the component', async () => {
    const fixture = await create([makePunto()]);
    const chart = ultimaInstancia();
    fixture.destroy();
    expect(chart.destroy).toHaveBeenCalledTimes(1);
  });
});
