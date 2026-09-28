import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.route')
        .then(c => c.AUTH_ROUTES),
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./modules/home/pages/home')
        .then(c => c.Home),
  },
  {
    path: 'ventas',
    loadChildren: () =>
      import('./modules/ventas/ventas.route')
	      .then(m => m.VENTAS_ROUTES)
  },
  {
    path: 'ds-showcase',
    loadComponent: () =>
      import('./ds-showcase/ds-showcase')
        .then(c => c.DsShowcase),
  },
  // {
  //   path: '',
  //   loadComponent: () => import('./core/layouts/main-layout/main-layout').then(c => c.MainLayout),
  //   canActivate: [authGuard],
  //   children: [
  //     { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES) },
  //     { path: 'ventas', loadChildren: () => import('./features/ventas/ventas.routes').then(m => m.VENTAS_ROUTES) },
  //     { path: 'inventario', loadChildren: () => import('./features/inventario/inventario.routes').then(m => m.INVENTARIO_ROUTES) },
  //     { path: 'produccion', loadChildren: () => import('./features/produccion/produccion.routes').then(m => m.PRODUCCION_ROUTES) },
  //     { path: 'gestion-estrategica', loadChildren: () => import('./features/gestion-estrategica/gestion-estrategica.routes').then(m => m.GESTION_ESTRATEGICA_ROUTES) },
  //     { path: 'configuracion', loadChildren: () => import('./features/configuracion/configuracion.routes').then(m => m.CONFIGURACION_ROUTES) },
  //     { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  //   ],
  // },
  {
    path: '**',
    redirectTo: 'auth'
  },
];
