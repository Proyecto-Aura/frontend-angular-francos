import { Routes } from '@angular/router';
import { permisoGuard } from '../../../core/guards/permiso.guard';

// path = nombre que manda el backend en /rutas/mi-menu, ver nota en
// inventario/insumos/insumos.route.ts
export const CATALOGO_ROUTES: Routes = [
  {
    path: 'gestion-productos',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/listar-catalogo/listar-catalogo')
        .then(c => c.ListarCatalogo),
  },
  {
    path: 'configuracion-catalogo',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/configuracion-catalogo/configuracion-catalogo')
        .then(c => c.ConfiguracionCatalogo),
  },
  {
    path: '',
    redirectTo: 'gestion-productos',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'gestion-productos',
  },
];
