import { Component, Type, computed, input, output } from '@angular/core';
import {
  LucideCheck,
  LucideCircleAlert,
  LucideInfo,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';

export type AlertTone = 'success' | 'error' | 'warning' | 'info';

const ICONOS: Record<AlertTone, Type<unknown>> = {
  success: LucideCheck,
  error: LucideCircleAlert,
  warning: LucideTriangleAlert,
  info: LucideInfo,
};

const ETIQUETAS: Record<AlertTone, string> = {
  success: 'Éxito',
  error: 'Error',
  warning: 'Advertencia',
  info: 'Información',
};

/** Mismos pares bg/fg que Badge (TONES): color solido, no transparente, asi no depende de lo que haya detras. */
const COLORES: Record<AlertTone, { bg: string; fg: string }> = {
  success: { bg: '#E4F6E8', fg: '#2E7D32' },
  error: { bg: '#FCE4E4', fg: '#C62828' },
  warning: { bg: '#FDEFD8', fg: '#B35D00' },
  info: { bg: '#E3F0FC', fg: '#1565C0' },
};

const INSIGNIAS: Record<AlertTone, string> = {
  success: 'bg-success',
  error: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-info',
};

/** Tarjeta de alerta con tono semántico, para mensajes que cambian según el flujo (login, guardado, etc.). */
@Component({
  imports: [Icon, IconButton],
  selector: 'app-ds-alert',
  templateUrl: './alert.html',
})
export class Alert {
  tone = input<AlertTone>('info');
  title = input.required<string>();
  description = input<string | null>(null);
  linkLabel = input<string | null>(null);
  closable = input(true);

  closed = output<void>();
  linkClick = output<void>();

  readonly LucideX = LucideX;

  protected icono = computed(() => ICONOS[this.tone()]);
  protected etiqueta = computed(() => ETIQUETAS[this.tone()]);
  protected colores = computed(() => COLORES[this.tone()]);
  protected insignia = computed(() => INSIGNIAS[this.tone()]);
}
