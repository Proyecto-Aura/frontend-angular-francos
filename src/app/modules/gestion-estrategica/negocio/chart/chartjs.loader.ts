let promesaChartJs: ReturnType<typeof importarChartJs> | null = null;

export function cargarChartJs() {
  promesaChartJs ??= importarChartJs();
  return promesaChartJs;
}

function importarChartJs() {
  return import('chart.js').then(
    ({ CategoryScale, Chart, LineController, LineElement, LinearScale, PointElement, Tooltip }) => {
      Chart.register(
        LineController,
        LineElement,
        PointElement,
        LinearScale,
        CategoryScale,
        Tooltip,
      );
      return Chart;
    },
  );
}
