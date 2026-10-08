import { Routes } from '@angular/router';

export const TI_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/ti-home/ti-home')
        .then(c => c.TiHome),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
