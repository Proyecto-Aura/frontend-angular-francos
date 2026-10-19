import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';

// Sin sidebarLinks/sidebarTitle hardcodeados a proposito — moduleNombre solo
// alcanza para que ModuleLayout arme el sidebar entero desde /rutas/mi-menu
// (ver inventario.route.ts, mismo patron).
export const GESTION_ESTRATEGICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      moduleNombre: 'estrategico',
    },
    children: [
      {
        path: 'gestion-estrategica-negocio',
        loadChildren: () => import('./negocio/negocio.route').then((m) => m.NEGOCIO_ROUTES),
      },
      {
        path: 'gestion-estrategica-ti',
        canActivate: [permisoGuard],
        loadChildren: () => import('./ti/ti.route').then((m) => m.TI_ROUTES),
      },
      {
        path: 'plan-estrategico',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./plan-estrategico/pages/plan-estrategico-home/plan-estrategico-home').then(
            (c) => c.PlanEstrategicoHome,
          ),
      },
      {
        path: '',
        redirectTo: 'plan-estrategico',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'plan-estrategico',
      },
    ],
  },
];
