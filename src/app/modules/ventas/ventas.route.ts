import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';

// Sin sidebarLinks/sidebarTitle hardcodeados a proposito — moduleNombre solo
// alcanza para que ModuleLayout arme el sidebar entero desde /rutas/mi-menu
// (ver inventario.route.ts, mismo patron). "clientes" es hoja directa en el
// backend (sin hijos), por eso va suelta y no detras de su propio router de
// grupo como catalogo/mis-pedidos.
export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../layouts/module-layout/module-layout').then(c => c.ModuleLayout),
    data: {
      moduleNombre: 'ventas',
    },
    children: [
      {
        path: 'clientes',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./clientes/pages/listar-clientes/listar-clientes')
            .then(c => c.ListarClientes),
      },
      {
        path: 'catalogo',
        loadChildren: () => import('./catalogo/catalogo.route').then(m => m.CATALOGO_ROUTES),
      },
      {
        path: 'mis-pedidos',
        loadChildren: () => import('./mis-pedidos/mis-pedidos.route').then(m => m.MIS_PEDIDOS_ROUTES),
      },
      {
        path: '',
        redirectTo: 'clientes',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'clientes',
      },
    ],
  },
];
