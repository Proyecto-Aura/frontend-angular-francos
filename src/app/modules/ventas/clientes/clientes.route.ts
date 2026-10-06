import { Routes } from '@angular/router';

export const CLIENTES_ROUTES: Routes = [
  {
    path: 'listar-cliente',
    loadComponent: () =>
      import('../clientes/pages/listar-clientes/listar-clientes').then((c) => c.ListarClientes),
  },
  {
    path: '**',
    redirectTo: 'listar-cliente',
  },
];
