import { Routes } from '@angular/router';
import { permisoGuard } from '../../../core/guards/permiso.guard';

// path = nombre que manda el backend en /rutas/mi-menu, ver nota en
// inventario/insumos/insumos.route.ts
export const MIS_PEDIDOS_ROUTES: Routes = [
  {
    path: 'gestion-pedidos',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/gestion-pedidos/gestion-pedidos')
        .then(c => c.GestionPedidos),
  },
  {
    path: 'reembolsos',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/reembolsos/reembolsos')
        .then(c => c.Reembolsos),
  },
  {
    path: '',
    redirectTo: 'gestion-pedidos',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'gestion-pedidos',
  },
];
