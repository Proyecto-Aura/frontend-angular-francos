import { Routes } from '@angular/router';
import {
  LucideLayoutDashboard,
  LucideUsers,
  LucidePackage,
  LucideList,
  LucideSettings,
  LucideShoppingCart,
  LucideRotateCcw,
} from '@lucide/angular';

// Nota: label/icon/path hoy estan fijos aca a mano. Cuando exista el backend,
// esta estructura (y que opciones ve cada usuario) deberia venir de la BD segun su rol.
export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      sidebarTitle: 'Gestión de Ventas',
      sidebarLinks: [
        { label: 'Dashboard', path: 'dashboard', icon: LucideLayoutDashboard },
        { label: 'Clientes', path: 'clientes', icon: LucideUsers },
        {
          label: 'Catalogo',
          icon: LucidePackage,
          children: [
            { label: 'Gestión de productos', path: 'catalogo/productos', icon: LucideList },
            {
              label: 'Configuración del catálogo',
              path: 'catalogo/configuracion',
              icon: LucideSettings,
            },
          ],
        },
        {
          label: 'Mis Pedidos',
          icon: LucideShoppingCart,
          children: [
            { label: 'Gestión de pedidos', path: 'pedidos/gestion', icon: LucideList },
            { label: 'Reembolsos', path: 'pedidos/reembolsos', icon: LucideRotateCcw },
          ],
        },
      ],
    },
    children: [
      {
        path: 'clientes',
        loadChildren: () => import('./clientes/clientes.route').then((m) => m.CLIENTES_ROUTES),
      },
      // {
      //   path: 'catalogo',
      //   loadChildren: () =>
      //     import('./catalogo/catalogo.route').
      //   then(m => m.CATALOGO_ROUTES)
      // },
      // { path: 'pedidos',
      //   loadChildren: () =>
      //     import('./pedidos/pedidos.route').
      //   then(m => m.PEDIDOS_ROUTES)
      // },
      {
        path: '',
        redirectTo: 'clientes',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'clientes',
      },
    ],
  },
];
