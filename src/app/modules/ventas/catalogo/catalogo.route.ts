import { Routes } from '@angular/router';

export const CATALOGO_ROUTES: Routes = [
  {
    path: 'productos',
    loadComponent: () =>
      import('./pages/listar-catalogo/listar-catalogo').then((c) => c.ListarCatalogo),
  },
  {
    path: 'configuracion',
    loadComponent: () =>
      import('./pages/configuracion-catalogo/configuracion-catalogo').then(
        (c) => c.ConfiguracionCatalogo,
      ),
  },
  {
    path: '',
    redirectTo: 'productos',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'productos',
  },
];
