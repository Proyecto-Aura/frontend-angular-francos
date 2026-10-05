import { Component, input, model } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-switch',
  templateUrl: './switch.html',
})
export class Switch {
  checked = model(false);
  label = input<string | null>(null);
  disabled = input(false);

  onChange(event: Event) {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
