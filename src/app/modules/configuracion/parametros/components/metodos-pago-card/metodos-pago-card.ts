import { Component, input, output } from '@angular/core';

import { Card } from '../../../../../shared/ds/card/card';
import { Switch } from '../../../../../shared/ds/switch/switch';

/** RF-A195: métodos de pago que ofrece el portal del cliente. Debe quedar al menos uno. */
@Component({
  imports: [Card, Switch],
  selector: 'app-metodos-pago-card',
  templateUrl: './metodos-pago-card.html',
})
export class MetodosPagoCard {
  culqi = input(false);
  efectivo = input(false);
  error = input<string | null>(null);

  culqiChange = output<boolean>();
  efectivoChange = output<boolean>();
}
