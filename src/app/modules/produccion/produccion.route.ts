import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';

// path = nombre que manda el backend en /rutas/mi-menu (uq_ruta_nombre es
// unico global, no por modulo) — por eso "produccion-solicitudes" y
// "produccion-solicitudes-insumos" en vez de "solicitudes-produccion"/
// "solicitudes-insumos": esos nombres ya los usan las paginas de Inventario
// (ver productos-terminados.route.ts / insumos.route.ts), asi que el
// backend creo nombres distintos para este modulo nuevo (confirmado por el
// backend, OFT0-263).
export const PRODUCCION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      moduleNombre: 'produccion',
    },
    children: [
      {
        path: 'produccion-solicitudes',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./solicitudes-produccion/pages/solicitudes-produccion/solicitudes-produccion').then(
            (c) => c.SolicitudesProduccion,
          ),
      },
      {
        path: 'produccion-solicitudes-insumos',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./solicitudes-insumos/pages/solicitudes-insumos/solicitudes-insumos').then(
            (c) => c.SolicitudesInsumos,
          ),
      },
      {
        path: '',
        redirectTo: 'produccion-solicitudes',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'produccion-solicitudes',
      },
    ],
  },
];
