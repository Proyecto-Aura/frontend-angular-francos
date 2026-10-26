import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';

export const CONFIGURACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      // El sidebar sale de /rutas/mi-menu (nombre real del módulo en la BD).
      moduleNombre: 'configuracion',
    },
    children: [
      {
        path: 'empresa',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./empresa/pages/datos-empresa/datos-empresa').then((c) => c.DatosEmpresa),
      },
      {
        path: '',
        redirectTo: 'empresa',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'empresa',
      },
    ],
  },
];
