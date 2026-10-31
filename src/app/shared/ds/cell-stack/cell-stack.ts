import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-cell-stack',
  templateUrl: './cell-stack.html',
})
export class CellStack {
  primary = input('');
  secondary = input<string | null>(null);
  strong = input(true);
  // Opt-in: por defecto el secundario va en texto normal (el uso mas
  // comun, ej. nombre + email). Algunas celdas muestran dos codigos
  // relacionados (ej. codigo de movimiento + codigo de lote) donde ambos
  // deberian leerse con el mismo peso.
  secondaryStrong = input(false);
}
