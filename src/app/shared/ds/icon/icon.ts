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
  // Junto a texto (botones, badges, inputs) el host queda en flujo inline y
  // Angular no fuerza su display, asi que por defecto se alinea a la linea
  // base del texto en vez del centro visual — vertical-align lo corrige.
  // Donde el icono ya vive dentro de un contenedor flex con items-center
  // (kpi-card, icon-button) esta propiedad simplemente no aplica.
  host: { style: 'vertical-align: middle;' },
})
export class Icon {
  img = input.required<Type<unknown>>();
  size = input(16);
  strokeWidth = input(2);
  color = input('currentColor');
}
