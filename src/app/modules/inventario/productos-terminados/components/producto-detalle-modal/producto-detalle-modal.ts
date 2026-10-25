import { Component, computed, input, output, signal } from '@angular/core';
import {
  LucideCalendarClock,
  LucideFileText,
  LucideClock as LucideHistorial,
  LucideLayers,
  LucidePackage,
  LucideTrendingDown,
  LucideTrendingUp,
} from '@lucide/angular';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import {
  NivelStockProducto,
  ProductoPresentacion,
  calcularNivelStockProducto,
} from '../../interfaces/producto-presentacion.interface';
import { etiquetaPresentacion } from '../../mappers/producto-presentacion.mapper';

const SIN_DATO = '—';

const NIVEL_LABEL: Record<NivelStockProducto, string> = {
  normal: 'Normal',
  alto: 'Stock alto',
  bajo: 'Stock bajo',
  agotado: 'Agotado',
};

const NIVEL_TONE: Record<NivelStockProducto, BadgeTone> = {
  normal: 'success',
  alto: 'info',
  bajo: 'warning',
  agotado: 'danger',
};

interface Campo {
  label: string;
  value: string;
}

// Mismo patron que InsumoDetalleModal (KPIs + tabs + grilla de campos), pero
// "Lotes" e "Historial" quedan como placeholder: producto terminado todavia
// no maneja lotes ni movimientos (es otra historia), asi que "Proximo
// vencimiento" tampoco tiene de donde salir todavia — se muestra "—". Solo
// el boton "Cerrar" en el pie: "Editar"/"Registrar movimiento" ya estan
// disponibles como acciones de fila en la tabla, no hace falta duplicarlos
// aca (confirmado con el usuario).
@Component({
  imports: [Badge, Button, Icon, KpiCard, Modal, Tabs],
  selector: 'app-producto-detalle-modal',
  templateUrl: './producto-detalle-modal.html',
})
export class ProductoDetalleModal {
  /** null = cerrado. */
  producto = input<ProductoPresentacion | null>(null);
  closed = output<void>();

  readonly LucidePackage = LucidePackage;
  readonly LucideCalendarClock = LucideCalendarClock;
  readonly LucideTrendingDown = LucideTrendingDown;
  readonly LucideTrendingUp = LucideTrendingUp;

  readonly tabs: DsTab[] = [
    { id: 'informacion', label: 'Información', icon: LucideFileText },
    { id: 'lotes', label: 'Lotes', icon: LucideLayers },
    { id: 'historial', label: 'Historial', icon: LucideHistorial },
  ];
  tabActiva = signal('informacion');

  nivel = computed<NivelStockProducto | null>(() => {
    const producto = this.producto();
    return producto ? calcularNivelStockProducto(producto) : null;
  });

  nivelLabel = computed(() => {
    const nivel = this.nivel();
    return nivel ? NIVEL_LABEL[nivel] : '';
  });

  nivelTone = computed<BadgeTone>(() => {
    const nivel = this.nivel();
    return nivel ? NIVEL_TONE[nivel] : 'neutral';
  });

  campos = computed<Campo[]>(() => {
    const producto = this.producto();
    if (!producto) return [];
    return [
      { label: 'SKU', value: producto.sku },
      { label: 'Nombre', value: producto.productoNombre },
      { label: 'Categoría', value: producto.categoriaNombre },
      {
        label: 'Presentación',
        value: etiquetaPresentacion(
          producto.presentacionCantidad,
          producto.presentacionUnidadMedida,
        ),
      },
      { label: 'Unidad de medida', value: producto.presentacionUnidadMedida },
      { label: 'Stock actual', value: String(producto.stockActual) },
      { label: 'Stock mínimo', value: String(producto.stockMinimo) },
      {
        label: 'Stock máximo',
        value: producto.stockMaximo !== null ? String(producto.stockMaximo) : SIN_DATO,
      },
      { label: 'Nivel de stock', value: this.nivelLabel() },
      { label: 'Estado', value: producto.estado ? 'Activo' : 'Inactivo' },
      { label: 'Descripción', value: producto.productoDescripcion || SIN_DATO },
    ];
  });

  cambiarTab(id: string): void {
    this.tabActiva.set(id);
  }

  cerrar(): void {
    this.tabActiva.set('informacion');
    this.closed.emit();
  }
}
