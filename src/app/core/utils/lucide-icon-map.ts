import { Type } from '@angular/core';
import {
  LucidePackage,
  LucideBox,
  LucideBoxes,
  LucideClipboardList,
  LucideShoppingCart,
  LucideRecycle,
  LucideStore,
  LucideUsers,
  LucideList,
  LucideSettings,
  LucideRotateCcw,
  LucideCompass,
  LucideTarget,
  LucideBuilding2,
  LucideMonitor,
  LucideFlag,
  LucideMap,
  LucideBarChart3,
  LucideRocket,
  LucideLayoutDashboard,
  LucideFolderOpen,
} from '@lucide/angular';

// El backend manda el icono como texto kebab-case (ver RutaNodo.icono) — van
// completandose a medida que aparecen modulos nuevos con iconos que todavia
// no estaban mapeados (ver Ventas/Gestion Estrategica).
const ICON_MAP: Record<string, Type<unknown>> = {
  package: LucidePackage,
  box: LucideBox,
  boxes: LucideBoxes,
  'clipboard-list': LucideClipboardList,
  'shopping-cart': LucideShoppingCart,
  recycle: LucideRecycle,
  store: LucideStore,
  users: LucideUsers,
  list: LucideList,
  settings: LucideSettings,
  'rotate-ccw': LucideRotateCcw,
  compass: LucideCompass,
  target: LucideTarget,
  'building-2': LucideBuilding2,
  monitor: LucideMonitor,
  flag: LucideFlag,
  map: LucideMap,
  'bar-chart-3': LucideBarChart3,
  rocket: LucideRocket,
  'layout-dashboard': LucideLayoutDashboard,
  'folder-open': LucideFolderOpen,
};

// undefined para un nombre desconocido en vez de tirar error — un icono que
// falte no deberia romper el menu, el Sidebar ya maneja "sin icono".
export function resolveLucideIcon(name: string): Type<unknown> | undefined {
  return ICON_MAP[name];
}
