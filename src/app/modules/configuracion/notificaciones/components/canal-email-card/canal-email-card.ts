import { Component, input, output } from '@angular/core';
import { Card } from '../../../../../shared/ds/card/card';
import { Switch } from '../../../../../shared/ds/switch/switch';

/** RF-A185: canal de notificación por email (SMTP). Remitente/servidor/seguridad son de solo lectura. */
@Component({
  imports: [Card, Switch],
  selector: 'app-canal-email-card',
  templateUrl: './canal-email-card.html',
})
export class CanalEmailCard {
  activo = input(false);
  remitente = input('');
  servidorSmtp = input('');
  seguridad = input('');

  activoChange = output<boolean>();
}
