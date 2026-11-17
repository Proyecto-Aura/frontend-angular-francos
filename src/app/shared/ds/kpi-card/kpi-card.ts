import { Component, computed, input } from '@angular/core';

export type KpiDeltaTone = 'up' | 'down' | 'neutral';
export type KpiCardSize = 'md' | 'sm';
// Mismos tonos que BadgeTone (duplicado a proposito, igual criterio que el
// resto del DS — ej. TONE_FG repetido en varios componentes — para no
// acoplar kpi-card a badge).
export type KpiCardIconTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

// Mismos valores que TONES en badge.ts.
const ICON_TONES: Record<KpiCardIconTone, { bg: string; fg: string }> = {
  neutral: { bg: '#F1F1F1', fg: '#5C5C5C' },
  brand: { bg: 'rgba(210,43,43,0.08)', fg: '#D22B2B' },
  success: { bg: '#E4F6E8', fg: '#2E7D32' },
  warning: { bg: '#FDEFD8', fg: '#B35D00' },
  danger: { bg: '#FCE4E4', fg: '#C62828' },
  info: { bg: '#E3F0FC', fg: '#1565C0' },
};

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
  // null (default) = el chip del icono queda como siempre (bg-accent) — no
  // cambia nada de lo existente. Con un tono, el chip toma ese color (ej.
  // tarjetas de "Pendientes/En proceso/Completadas/Canceladas" con un color
  // por estado, igual criterio que los tonos de Badge).
  iconTone = input<KpiCardIconTone | null>(null);

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
  iconColors = computed(() => {
    const tone = this.iconTone();
    return tone ? ICON_TONES[tone] : null;
  });
}
