import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { cargarChartJs } from '../../chart/chartjs.loader';
import { formatearValor } from '../kpi-form-modal/kpi.reglas';
import { SeguimientoPunto } from '../../interfaces/seguimiento-kpis.interface';
import {
  etiquetaEjeX,
  etiquetaPeriodoCompleta,
  formatearEjeY,
} from '../../pages/tablero-control/tablero-graficos.reglas';

@Component({
  imports: [],
  selector: 'app-kpi-tendencia-chart',
  templateUrl: './kpi-tendencia-chart.html',
})
export class KpiTendenciaChart {
  private destroyRef = inject(DestroyRef);
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private grafico: { destroy(): void } | null = null;
  private renderActual = 0;
  private destruido = false;

  readonly serie = input.required<SeguimientoPunto[]>();
  readonly unidadSimbolo = input.required<string>();
  readonly descripcion = input.required<string>();
  readonly tieneValores = computed(() => this.serie().some((punto) => punto.valor !== null));

  constructor() {
    effect(() => {
      const canvas = this.canvas()?.nativeElement ?? null;
      const serie = this.serie();
      const unidad = this.unidadSimbolo();
      void this.crearGrafico(canvas, serie, unidad);
    });
    this.destroyRef.onDestroy(() => {
      this.destruido = true;
      this.renderActual += 1;
      this.destruirGrafico();
    });
  }

  private async crearGrafico(
    canvas: HTMLCanvasElement | null,
    serie: SeguimientoPunto[],
    unidad: string,
  ): Promise<void> {
    const render = ++this.renderActual;
    this.destruirGrafico();
    if (!canvas || !serie.some((punto) => punto.valor !== null)) return;

    const Chart = await cargarChartJs();
    if (this.destruido || render !== this.renderActual) return;

    const estilosRaiz = getComputedStyle(document.documentElement);
    const color = (token: string) => estilosRaiz.getPropertyValue(token).trim();
    const colorPrimario = color('--color-primary');
    const colorSecundario = color('--color-muted-foreground');
    const colorBorde = color('--color-border');
    const colorTarjeta = color('--color-card');
    const coloresPuntos = serie.map((punto) => {
      if (punto.color === 'VERDE') return color('--color-success');
      if (punto.color === 'AMARILLO') return color('--color-warning');
      if (punto.color === 'ROJO') return color('--color-destructive');
      return colorSecundario;
    });
    const mostrarPeriodos = serie.length <= 12;
    const esAnual = serie.every((punto) => punto.periodoCodigo === 'A1');
    const etiquetas = serie.map((punto, indice) =>
      etiquetaEjeX(
        punto,
        indice === 0 || serie[indice - 1].anio !== punto.anio,
        mostrarPeriodos,
        esAnual,
      ),
    );
    const familiaFuente = getComputedStyle(document.body).fontFamily;

    this.grafico = new Chart(canvas, {
      type: 'line',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Meta del año',
            data: serie.map((punto) => punto.meta),
            borderColor: colorSecundario,
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            stepped: 'middle',
          },
          {
            label: 'Valor registrado',
            data: serie.map((punto) => punto.valor),
            borderColor: colorPrimario,
            borderWidth: 2.5,
            spanGaps: true,
            pointBackgroundColor: coloresPuntos,
            pointBorderColor: colorTarjeta,
            pointBorderWidth: 1.5,
            pointRadius: serie.length > 12 ? 3.5 : 4.5,
            pointHoverRadius: serie.length > 12 ? 4.5 : 5.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: (item) => item.datasetIndex === 1,
            callbacks: {
              title: (items) =>
                items.length > 0 ? etiquetaPeriodoCompleta(serie[items[0].dataIndex]) : '',
              label: (context) => {
                const punto = serie[context.dataIndex];
                if (punto.valor === null) return 'Sin valor';
                const valor = formatearValor(punto.valor, unidad);
                return punto.meta === null
                  ? valor
                  : `${valor} · meta ${formatearValor(punto.meta, unidad)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              color: colorSecundario,
              font: { family: familiaFuente, size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grace: '15%',
            grid: { color: colorBorde },
            ticks: {
              color: colorSecundario,
              font: { family: familiaFuente, size: 11 },
              callback: (value) => formatearEjeY(Number(value), unidad),
            },
          },
        },
      },
    });
  }

  private destruirGrafico(): void {
    this.grafico?.destroy();
    this.grafico = null;
  }
}
