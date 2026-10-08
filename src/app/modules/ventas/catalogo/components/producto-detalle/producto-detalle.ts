import { Component, computed, input, output } from '@angular/core';
import { LucideBan, LucidePackage, LucidePencil, LucideRotateCcw } from '@lucide/angular';

import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import {
  FilaCatalogo,
  UNIDAD,
  disponibilidadDe,
  fechaCorta,
  money,
  nf,
  slugDe,
} from '../../interfaces/producto.interface';

interface Campo {
  label: string;
  value: string;
}

@Component({
  imports: [Badge, Button, Icon, Modal],
  selector: 'app-producto-detalle',
  templateUrl: './producto-detalle.html',
})
export class ProductoDetalle {
  /** null = cerrado. */
  fila = input<FilaCatalogo | null>(null);

  closed = output<void>();
  editar = output<FilaCatalogo>();
  alternarEstado = output<FilaCatalogo>();

  readonly LucidePackage = LucidePackage;
  readonly LucidePencil = LucidePencil;
  readonly LucideBan = LucideBan;
  readonly LucideRotateCcw = LucideRotateCcw;

  protected dispTone = computed<BadgeTone>(() => {
    const f = this.fila();
    if (!f) return 'neutral';
    const d = disponibilidadDe(f);
    return d === 'disponible' ? 'success' : d === 'bajo' ? 'warning' : 'danger';
  });

  protected dispLabel = computed(() => {
    const f = this.fila();
    if (!f) return '';
    const d = disponibilidadDe(f);
    return d === 'disponible' ? 'Disponible' : d === 'bajo' ? 'Stock bajo' : 'Agotado';
  });

  protected campos = computed<Campo[]>(() => {
    const f = this.fila();
    if (!f) return [];
    return [
      { label: 'Categoría', value: f.categoria },
      { label: 'Presentación', value: f.presentacion },
      { label: 'SKU', value: f.sku },
      { label: 'Precio unitario', value: money(f.precioUnit) },
      { label: 'Precio mayorista', value: money(f.precioMayor) },
      { label: 'Umbral mayorista', value: `${nf(f.umbral)} ${UNIDAD}` },
      { label: 'Stock', value: `${nf(f.stock)} ${UNIDAD}` },
      {
        label: 'Promoción',
        value: f.promo
          ? `-${f.promo.pct}% del ${fechaCorta(f.promo.ini)} al ${fechaCorta(f.promo.fin)}`
          : 'Sin promoción',
      },
      { label: 'Visible en Portal B', value: f.visible ? 'Activado' : 'Desactivado' },
      { label: 'Slug', value: slugDe(f.nombre, f.presentacion) },
    ];
  });
}
