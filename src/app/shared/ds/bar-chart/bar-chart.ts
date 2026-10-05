import { Component, computed, input } from '@angular/core';

export interface BarChartDatum {
  label: string;
  value: number;
  faded?: boolean;
}

@Component({
  imports: [],
  selector: 'app-ds-bar-chart',
  templateUrl: './bar-chart.html',
})
export class BarChart {
  data = input<BarChartDatum[]>([]);
  height = input(180);
  colorVar = input('--chart-1');
  valueFormat = input<((value: number) => string) | null>(null);

  max = computed(() => Math.max(...this.data().map((d) => d.value), 1));

  barHeightPct(value: number) {
    return (value / this.max()) * 100;
  }

  formatted(value: number) {
    const fn = this.valueFormat();
    return fn ? fn(value) : String(value);
  }
}
