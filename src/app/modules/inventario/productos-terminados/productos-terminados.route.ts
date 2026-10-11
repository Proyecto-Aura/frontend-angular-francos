import { Routes } from '@angular/router';
import { permisoGuard } from '../../../core/guards/permiso.guard';

// path = nombre que manda el backend en /rutas/mi-menu, ver nota en insumos.route.ts
export const PRODUCTOS_TERMINADOS_ROUTES: Routes = [
  {
    path: 'stock-productos',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/stock-productos/stock-productos').then((c) => c.StockProductos),
  },
  {
    path: 'pedidos-por-preparar',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/pedidos-por-preparar/pedidos-por-preparar').then((c) => c.PedidosPorPreparar),
  },
  {
    path: 'solicitudes-produccion',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/solicitudes-produccion/solicitudes-produccion').then(
        (c) => c.SolicitudesProduccion,
      ),
  },
  {
    path: '',
    redirectTo: 'stock-productos',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'stock-productos',
  },
];
