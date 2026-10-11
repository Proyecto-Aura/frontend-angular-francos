import { Routes } from '@angular/router';
import { permisoGuard } from '../../../core/guards/permiso.guard';

// path = nombre que manda el backend en /rutas/mi-menu, ver nota en
// inventario/insumos/insumos.route.ts
export const NEGOCIO_ROUTES: Routes = [
  {
    path: 'objetivos-estrategicos',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/objetivos-estrategicos/objetivos-estrategicos')
        .then(c => c.ObjetivosEstrategicos),
  },
  {
    path: 'mapa-estrategico',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/mapa-estrategico/mapa-estrategico')
        .then(c => c.MapaEstrategico),
  },
  {
    path: 'gestionar-kpis',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/gestionar-kpis/gestionar-kpis')
        .then(c => c.GestionarKpis),
  },
  {
    path: 'gestionar-iniciativas',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/gestionar-iniciativas/gestionar-iniciativas')
        .then(c => c.GestionarIniciativas),
  },
  {
    path: 'tablero-control',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/tablero-control/tablero-control')
        .then(c => c.TableroControl),
  },
  {
    path: 'analisis-estrategico',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/analisis-estrategico/analisis-estrategico')
        .then(c => c.AnalisisEstrategico),
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
];
