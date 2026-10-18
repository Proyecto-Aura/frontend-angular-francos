import { Routes } from '@angular/router';
import { permisoGuard } from '../../../core/guards/permiso.guard';

// path = nombre que manda el backend en /rutas/mi-menu, ver nota en
// inventario/insumos/insumos.route.ts. NegocioLayout no es parte de ese
// contrato: solo agrega la barra de "plan seleccionado" encima del outlet.
export const NEGOCIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/negocio-layout/negocio-layout').then((c) => c.NegocioLayout),
    children: [
      {
        path: 'objetivos-estrategicos',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/objetivos-estrategicos/objetivos-estrategicos').then(
            (c) => c.ObjetivosEstrategicosPage,
          ),
      },
      {
        path: 'mapa-estrategico',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/mapa-estrategico/mapa-estrategico-page').then(
            (c) => c.MapaEstrategicoPage,
          ),
      },
      {
        path: 'gestionar-kpis',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/gestionar-kpis/gestionar-kpis-page').then((c) => c.GestionarKpisPage),
      },
      {
        path: 'gestionar-iniciativas',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/gestionar-iniciativas/gestionar-iniciativas-page').then(
            (c) => c.GestionarIniciativasPage,
          ),
      },
      {
        path: 'tablero-control',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/tablero-control/tablero-control-page').then((c) => c.TableroControlPage),
      },
      {
        path: 'analisis-estrategico',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/analisis-estrategico/analisis-estrategico-page').then(
            (c) => c.AnalisisEstrategicoPage,
          ),
      },
      {
        path: '',
        redirectTo: 'objetivos-estrategicos',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'objetivos-estrategicos',
      },
    ],
  },
];
