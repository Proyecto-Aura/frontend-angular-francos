import { Component, Type, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

/**
 * Generic Lucide wrapper — port of core/Icon.jsx. Pass the icon component class imported
 * from '@lucide/angular' (e.g. `LucideShoppingCart`) as `img`, matching that package's
 * per-icon attribute-directive API (each icon is its own standalone component).
 */
@Component({
  imports: [NgComponentOutlet],
  selector: 'app-ds-icon',
  templateUrl: './icon.html',
})
export class Icon {
  img = input.required<Type<unknown>>();
  size = input(16);
  strokeWidth = input(2);
  color = input('currentColor');
}
