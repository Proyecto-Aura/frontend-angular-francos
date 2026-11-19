import { Component } from '@angular/core';

import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/ds/breadcrumb/breadcrumb';
import { StockMinimoPanel } from '../../components/stock-minimo-panel/stock-minimo-panel';

/** HU-A-046: stock mínimo de alerta por producto terminado o insumo (RF-A196), solo admin. */
@Component({
  imports: [Breadcrumb, StockMinimoPanel],
  selector: 'app-parametros-inventario',
  templateUrl: './parametros-inventario.html',
})
export class ParametrosInventario {
  protected readonly migas: BreadcrumbItem[] = [
    { label: 'Configuración' },
    { label: 'Parámetros de inventario' },
  ];
}
