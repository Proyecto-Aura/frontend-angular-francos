import { Routes } from '@angular/router';
import { LucideBuilding2 } from '@lucide/angular';

export const CONFIGURACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      sidebarTitle: 'Configuración',
      // Menú propio mientras el backend no publique el módulo en /rutas/mi-menu.
      sidebarLinks: [
        { label: 'Datos de empresa', path: '/configuracion/empresa', icon: LucideBuilding2 },
      ],
    },
    children: [
      {
        path: 'empresa',
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
