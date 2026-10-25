import { Routes } from '@angular/router';
import { permisoGuard } from '../../../core/guards/permiso.guard';

// path = nombre que manda el backend en /rutas/mi-menu. TiLayout no forma
// parte de ese contrato: solo agrega la barra de plan seleccionado al outlet.
export const TI_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/ti-layout/ti-layout').then((c) => c.TiLayout),
    children: [
      {
        path: 'objetivos-estrategicos-ti',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/objetivos-estrategicos-ti/objetivos-estrategicos-ti').then(
            (c) => c.ObjetivosEstrategicosTiPage,
          ),
      },
      {
        path: 'analisis-estrategico-ti',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/analisis-estrategico-ti/analisis-estrategico-ti').then(
            (c) => c.AnalisisEstrategicoTiPage,
          ),
      },
      {
        path: 'mapa-estrategico-ti',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/mapa-estrategico-ti/mapa-estrategico-ti').then(
            (c) => c.MapaEstrategicoTiPage,
          ),
      },
      {
        path: 'gestionar-kpis-ti',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/gestionar-kpis-ti/gestionar-kpis-ti').then((c) => c.GestionarKpisTiPage),
      },
      {
        path: 'gestionar-iniciativas-ti',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/gestionar-iniciativas-ti/gestionar-iniciativas-ti').then(
            (c) => c.GestionarIniciativasTiPage,
          ),
      },
      {
        path: '',
        redirectTo: 'objetivos-estrategicos-ti',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'objetivos-estrategicos-ti',
      },
    ],
  },
];
