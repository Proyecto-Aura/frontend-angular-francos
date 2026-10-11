import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { MenuService } from '../services/menu.service';
import { existeNombreEnArbol } from '../utils/ruta-nodo-tree.util';

// Compara el segmento de ruta contra el que el usuario tiene permitido segun
// /rutas/mi-menu (ya filtrado por rol). Se apoya en que el "path" de cada
// ruta de pagina real se eligio a proposito igual al "nombre" del backend
// (ver insumos.route.ts) — si alguna vez dejan de coincidir, este guard deja
// de poder identificar esa ruta y la bloquea de mas, no de menos.
export const permisoGuard: CanActivateFn = route => {
  const menuService = inject(MenuService);
  const router = inject(Router);

  const nombre = route.routeConfig?.path;
  if (!nombre) return true;

  return menuService.getTree().pipe(
    map(tree => (existeNombreEnArbol(tree, nombre) ? true : router.createUrlTree(['/home']))),
    catchError(() => of(router.createUrlTree(['/auth']))),
  );
};
