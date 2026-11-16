import { Routes } from '@angular/router';
import { permisoGuard } from '../../core/guards/permiso.guard';
import { primerHijoPermitidoGuard } from '../../core/guards/primer-hijo-permitido.guard';

// Insumos: modulo de primer nivel (antes vivia anidado dentro de Inventario;
// se separo en su propio rol "insumos", mismo patron que Despacho HU-A-023)
// — "insumos" es el nombre del MODULO en el backend (usado aca como
// moduleNombre, para que ModuleLayout arme el sidebar).
//
// path de cada pagina = nombre que manda el backend en /rutas/mi-menu
// (uq_ruta_nombre es unico global, no por modulo) — asi el sidebar dinamico
// y el permisoGuard arman/chequean la ruta sin necesitar una tabla de mapeo
// aparte.
export const INSUMOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      moduleNombre: 'insumos',
    },
    children: [
      {
        path: 'stock-insumos',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/stock-insumos/stock-insumos').then((c) => c.StockInsumos),
      },
      {
        path: 'solicitudes-insumos',
        canActivate: [permisoGuard],
        loadComponent: () =>
          import('./pages/solicitudes-insumos/solicitudes-insumos').then(
            (c) => c.SolicitudesInsumos,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        canActivate: [primerHijoPermitidoGuard('insumos', { preferido: 'stock-insumos' })],
        children: [],
      },
      {
        path: '**',
        canActivate: [primerHijoPermitidoGuard('insumos', { preferido: 'stock-insumos' })],
        children: [],
      },
    ],
  },
];
