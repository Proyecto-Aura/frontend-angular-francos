import { Component, computed, input } from '@angular/core';

export type KpiDeltaTone = 'up' | 'down' | 'neutral';

@Component({
  imports: [],
  selector: 'app-ds-kpi-card',
  templateUrl: './kpi-card.html',
})
export class KpiCard {
  label = input('');
  value = input<string | number>('');
  delta = input<string | null>(null);
  deltaTone = input<KpiDeltaTone>('neutral');
  caption = input<string | null>(null);
  hasIcon = input(false);

  toneClass = computed(() => {
    const tone = this.deltaTone();
    return tone === 'up'
      ? 'text-success'
      : tone === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';
  });
}
