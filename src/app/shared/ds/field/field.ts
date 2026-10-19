import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-field',
  templateUrl: './field.html',
})
export class Field {
  label = input<string | null>(null);
  hint = input<string | null>(null);
  error = input<string | null>(null);
  required = input(false);
  htmlFor = input<string | null>(null);
}
