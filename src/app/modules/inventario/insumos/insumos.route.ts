import { Routes } from '@angular/router';
import { permisoGuard } from '../../../core/guards/permiso.guard';

// path = nombre que manda el backend en /rutas/mi-menu (uq_ruta_nombre es
// unico global, no por modulo) — asi el sidebar dinamico y el permisoGuard
// arman/chequean la ruta sin necesitar una tabla de mapeo aparte.
export const INSUMOS_ROUTES: Routes = [
  {
    path: 'stock-insumos',
    canActivate: [permisoGuard],
    loadComponent: () => import('./pages/stock-insumos/stock-insumos').then((c) => c.StockInsumos),
  },
  {
    path: 'solicitudes-insumos',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/solicitudes-insumos/solicitudes-insumos').then((c) => c.SolicitudesInsumos),
  },
  {
    path: '',
    redirectTo: 'stock-insumos',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'stock-insumos',
  },
];
