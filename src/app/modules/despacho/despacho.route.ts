import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';

// Despachos (HU-A-023): modulo de primer nivel (confirmado por el backend,
// el `nombre` de su ruta "despacho-pedidos" cuelga de parent_id=NULL, no de
// Inventario como se armo al principio) — "despacho-pedidos" es el nombre
// del MODULO (usado aca como moduleNombre, para que ModuleLayout arme el
// sidebar), y "gestion-despachos" es el nombre de su unica pagina real
// (hijo de despacho-pedidos en el arbol, agregado a pedido del usuario para
// que el sidebar no quede vacio) — mismo patron de 2 niveles que
// productos-terminados/pedidos-por-preparar dentro de Inventario.
export const DESPACHO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      moduleNombre: 'despacho-pedidos',
    },
    children: [
      {
        path: 'gestion-despachos',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/despacho-pedidos/despacho-pedidos').then((c) => c.DespachoPedidos),
      },
      {
        path: '',
        redirectTo: 'gestion-despachos',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'gestion-despachos',
      },
    ],
  },
];
