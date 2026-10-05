import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-card',
  templateUrl: './card.html',
})
export class Card {
  title = input<string | null>(null);
  subtitle = input<string | null>(null);
  hasActions = input(false);
  hasFooter = input(false);
  padded = input(true);
}
