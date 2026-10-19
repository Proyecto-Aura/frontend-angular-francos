import { Component, input, output } from '@angular/core';
import { LucideCircleAlert, LucideCircleCheck, LucideX } from '@lucide/angular';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';

/** Aviso del diseño: tarjeta con ícono, mensaje y botón para cerrar (verde = éxito, rojo = error). */
@Component({
  imports: [Icon, IconButton],
  selector: 'app-aviso-banner',
  templateUrl: './aviso-banner.html',
})
export class AvisoBanner {
  texto = input('');
  tono = input<'ok' | 'error'>('ok');
  closed = output<void>();

  readonly LucideCircleAlert = LucideCircleAlert;
  readonly LucideCircleCheck = LucideCircleCheck;
  readonly LucideX = LucideX;
}
