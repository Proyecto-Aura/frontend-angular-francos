import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';
import { primerHijoPermitidoGuard } from '../../core/guards/primer-hijo-permitido.guard';

// Inventario = productos terminados (Insumos se separo en su propio modulo
// de primer nivel, ver insumos/insumos.route.ts). Los hijos ya son paginas
// directas, sin modulo intermedio: path = nombre que manda el backend en
// /rutas/mi-menu, ver nota en insumos.route.ts.
export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      // Esto es lo que activa el fetch a /rutas/tree en ModuleLayout — no es
      // data falsa, es el nombre real del modulo tal como esta en la BD.
      moduleNombre: 'inventario',
    },
    children: [
      {
        path: 'stock-productos',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./productos-terminados/pages/stock-productos/stock-productos').then(
            (c) => c.StockProductos,
          ),
      },
      {
        path: 'pedidos-por-preparar',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./productos-terminados/pages/pedidos-por-preparar/pedidos-por-preparar').then(
            (c) => c.PedidosPorPreparar,
          ),
      },
      {
        path: 'solicitudes-produccion',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./productos-terminados/pages/solicitudes-produccion/solicitudes-produccion').then(
            (c) => c.SolicitudesProduccion,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        canActivate: [primerHijoPermitidoGuard('inventario', { preferido: 'stock-productos' })],
        children: [],
      },
      {
        path: '**',
        canActivate: [primerHijoPermitidoGuard('inventario', { preferido: 'stock-productos' })],
        children: [],
      },
    ],
  },
];
