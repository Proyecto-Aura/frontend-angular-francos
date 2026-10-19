import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-radio',
  templateUrl: './radio.html',
})
export class Radio {
  checked = input(false);
  name = input<string | null>(null);
  value = input<string | null>(null);
  label = input<string | null>(null);
  description = input<string | null>(null);
  disabled = input(false);

  changed = output<Event>();
}
