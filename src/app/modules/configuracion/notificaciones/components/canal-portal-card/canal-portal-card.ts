import { Component, input, output } from '@angular/core';
import { Card } from '../../../../../shared/ds/card/card';
import { Switch } from '../../../../../shared/ds/switch/switch';

/** RF-A186: canal de notificación dentro del Portal B. */
@Component({
  imports: [Card, Switch],
  selector: 'app-canal-portal-card',
  templateUrl: './canal-portal-card.html',
})
export class CanalPortalCard {
  activo = input(false);
  destinatarios = input('');

  activoChange = output<boolean>();
}
