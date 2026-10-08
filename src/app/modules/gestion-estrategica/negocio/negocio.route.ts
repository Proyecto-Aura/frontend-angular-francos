import { Routes } from '@angular/router';

export const NEGOCIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/negocio-home/negocio-home')
        .then(c => c.NegocioHome),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
