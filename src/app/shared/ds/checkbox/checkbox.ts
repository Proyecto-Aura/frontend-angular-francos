import { Component, computed, input, model } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-checkbox',
  templateUrl: './checkbox.html',
})
export class Checkbox {
  checked = model(false);
  label = input<string | null>(null);
  description = input<string | null>(null);
  disabled = input(false);
  indeterminate = input(false);

  on = computed(() => this.checked() || this.indeterminate());

  onChange(event: Event) {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
