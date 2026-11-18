import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';
import { primerHijoPermitidoGuard } from '../../core/guards/primer-hijo-permitido.guard';

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
        path: 'usuarios',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./usuarios/pages/gestionar-usuarios/gestionar-usuarios').then(
            (c) => c.GestionarUsuarios,
          ),
      },
      {
        path: 'comprobantes',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./comprobantes/pages/gestionar-series/gestionar-series').then(
            (c) => c.GestionarSeries,
          ),
      },
      {
        path: 'parametros-ventas',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./parametros/pages/parametros-ventas/parametros-ventas').then(
            (c) => c.GestionarParametrosVentas,
          ),
      },
      {
        path: 'parametros-inventario',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./parametros/pages/parametros-inventario/parametros-inventario').then(
            (c) => c.ParametrosInventario,
          ),
      },
      {
        // Pantalla del propio usuario: no es un permiso de menú, basta con estar logueado.
        path: 'perfil',
        loadComponent: () =>
          import('./usuarios/pages/perfil-usuario/perfil-usuario').then((c) => c.PerfilUsuario),
      },
      {
        path: '',
        pathMatch: 'full',
        canActivate: [
          primerHijoPermitidoGuard('configuracion', { preferido: 'empresa', fallback: 'perfil' }),
        ],
        children: [],
      },
      {
        path: '**',
        canActivate: [
          primerHijoPermitidoGuard('configuracion', { preferido: 'empresa', fallback: 'perfil' }),
        ],
        children: [],
      },
    ],
  },
];
