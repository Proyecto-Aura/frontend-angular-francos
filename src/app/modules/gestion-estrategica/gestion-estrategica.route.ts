import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';

// Sin sidebarLinks/sidebarTitle hardcodeados a proposito — moduleNombre solo
// alcanza para que ModuleLayout arme el sidebar entero desde /rutas/mi-menu
// (ver inventario.route.ts, mismo patron).
export const GESTION_ESTRATEGICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../layouts/module-layout/module-layout').then(c => c.ModuleLayout),
    data: {
      moduleNombre: 'estrategico',
    },
    children: [
      {
        path: 'gestion-estrategica-negocio',
        loadChildren: () => import('./negocio/negocio.route').then(m => m.NEGOCIO_ROUTES),
      },
      {
        path: 'gestion-estrategica-ti',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./ti/pages/gestion-estrategica-ti/gestion-estrategica-ti')
            .then(c => c.GestionEstrategicaTi),
      },
      {
        path: 'plan-estrategico',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./plan-estrategico/pages/plan-estrategico/plan-estrategico')
            .then(c => c.PlanEstrategico),
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
