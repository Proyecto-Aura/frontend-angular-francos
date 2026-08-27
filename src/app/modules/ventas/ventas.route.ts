import { Routes } from '@angular/router';

export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../layouts/module-layout/module-layout').then(c => c.ModuleLayout),
    children: [
      // {
      //   path: 'clientes',
      //   loadChildren: () =>
      //     import('./clientes/clientes.route').
      //   then(m => m.CLIENTES_ROUTES)
      // },
      // {
      //   path: 'catalogo',
      //   loadChildren: () =>
      //     import('./catalogo/catalogo.route').
      //   then(m => m.CATALOGO_ROUTES)
      // },
      // { path: 'pedidos',
      //   loadChildren: () =>
      //     import('./pedidos/pedidos.route').
      //   then(m => m.PEDIDOS_ROUTES)
      // },
      // { path: '',
      //   redirectTo: 'pedidos',
      //   pathMatch: 'full'
      // },
    ],
  },
];
