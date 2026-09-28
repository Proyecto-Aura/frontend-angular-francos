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
}
