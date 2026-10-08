import { Component, input, output } from '@angular/core';
import { LucideCircleCheck, LucideX } from '@lucide/angular';

import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';

/** Aviso de confirmación del diseño: tarjeta con ícono verde, mensaje y botón para cerrar. */
@Component({
  imports: [Icon, IconButton],
  selector: 'app-aviso-banner',
  templateUrl: './aviso-banner.html',
})
export class AvisoBanner {
  texto = input('');
  closed = output<void>();

  readonly LucideCircleCheck = LucideCircleCheck;
  readonly LucideX = LucideX;
}
