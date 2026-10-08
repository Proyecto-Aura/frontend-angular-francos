import { Routes } from '@angular/router';

export const NEGOCIO_ROUTES: Routes = [
  {
    path: 'objetivos',
    loadComponent: () =>
      import('./pages/objetivos-estrategicos/objetivos-estrategicos').then(
        (c) => c.ObjetivosEstrategicosPage,
      ),
  },
  {
    path: 'mapa',
    loadComponent: () => import('./pages/negocio-home/negocio-home').then((c) => c.NegocioHome),
    data: { titulo: 'Mapa estratégico' },
  },
  {
    path: 'kpis',
    loadComponent: () => import('./pages/negocio-home/negocio-home').then((c) => c.NegocioHome),
    data: { titulo: 'Gestionar KPIs' },
  },
  {
    path: 'iniciativas',
    loadComponent: () => import('./pages/negocio-home/negocio-home').then((c) => c.NegocioHome),
    data: { titulo: 'Gestionar iniciativas' },
  },
  {
    path: 'tablero',
    loadComponent: () => import('./pages/negocio-home/negocio-home').then((c) => c.NegocioHome),
    data: { titulo: 'Tablero de control' },
  },
  {
    path: 'analisis',
    loadComponent: () => import('./pages/negocio-home/negocio-home').then((c) => c.NegocioHome),
    data: { titulo: 'Análisis estratégico' },
  },
  {
    path: '',
    redirectTo: 'objetivos',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'objetivos',
  },
];
