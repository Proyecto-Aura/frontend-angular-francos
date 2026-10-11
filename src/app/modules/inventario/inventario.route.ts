import { Routes } from '@angular/router';


export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../layouts/module-layout/module-layout').then(c => c.ModuleLayout),
    data: {
      // Esto es lo que activa el fetch a /rutas/tree en ModuleLayout — no es
      // data falsa, es el nombre real del modulo tal como esta en la BD.
      moduleNombre: 'inventario',
    },
    children: [
      {
        path: 'insumos',
        loadChildren: () => import('./insumos/insumos.route').then(m => m.INSUMOS_ROUTES),
      },
      {
        path: 'productos-terminados',
        loadChildren: () => import('./productos-terminados/productos-terminados.route').then(m => m.PRODUCTOS_TERMINADOS_ROUTES),
      },
      {
        path: '',
        redirectTo: 'insumos',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'insumos',
      },
    ],
  },
];
