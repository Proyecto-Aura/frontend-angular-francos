import { Component, computed, input } from '@angular/core';

export type KpiDeltaTone = 'up' | 'down' | 'neutral';
export type KpiCardSize = 'md' | 'sm';

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
  // 'sm' para filas de muchas tarjetas angostas (ej. el modal de detalle de
  // insumo con 5 tarjetas) — 'md' (default) no cambia nada de lo existente.
  size = input<KpiCardSize>('md');

  toneClass = computed(() => {
    const tone = this.deltaTone();
    return tone === 'up'
      ? 'text-success'
      : tone === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground';
  });

  valueClass = computed(() => (this.size() === 'sm' ? 'text-ds-lg' : 'text-ds-3xl'));
  iconBoxClass = computed(() => (this.size() === 'sm' ? 'h-7 w-7' : 'h-8 w-8'));
}
