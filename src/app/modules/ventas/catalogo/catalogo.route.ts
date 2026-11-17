import { Routes } from '@angular/router';
import { permisoGuard } from '../../../core/guards/permiso.guard';
import { primerHijoPermitidoGuard } from '../../../core/guards/primer-hijo-permitido.guard';

// path = nombre que manda el backend en /rutas/mi-menu, ver nota en
// insumos/insumos.route.ts
export const CATALOGO_ROUTES: Routes = [
  {
    path: 'gestion-productos',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/listar-catalogo/listar-catalogo').then((c) => c.ListarCatalogo),
  },
  {
    path: 'configuracion-catalogo',
    canActivate: [permisoGuard],
    loadComponent: () =>
      import('./pages/configuracion-catalogo/configuracion-catalogo').then(
        (c) => c.ConfiguracionCatalogo,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [primerHijoPermitidoGuard('catalogo', { preferido: 'gestion-productos' })],
    children: [],
  },
  {
    path: '**',
    canActivate: [primerHijoPermitidoGuard('catalogo', { preferido: 'gestion-productos' })],
    children: [],
  },
];
