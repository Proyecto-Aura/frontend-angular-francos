import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { MenuService } from '../services/menu.service';
import { hojasPermitidas } from '../utils/ruta-nodo-tree.util';

export interface PrimerHijoPermitidoOpciones {
  // Camino relativo al modulo/grupo (ej. 'stock-productos' o 'a/b'): si sigue
  // permitido es el destino, asi no cambia a donde llegan los roles que ya
  // funcionaban con el redirect fijo.
  preferido?: string;
  // Pagina fuera del menu pero siempre accesible (ej. 'perfil'), para cuando
  // el rol no tiene ninguna hoja de este nodo en su menu.
  fallback?: string;
}

// Reemplaza al redirectTo fijo de path '' / '**' de cada modulo: ese redirect
// es estatico y se resolvia antes de permisoGuard, asi que si el hijo fijo no
// estaba en el menu del rol rebotaba a /home aunque hubiera otras pantallas
// habilitadas. Un redirectTo como funcion no sirve: es sincrono y no puede
// esperar a /rutas/mi-menu. "nodo" va explicito porque el nombre del modulo
// en el arbol no siempre coincide con el segmento de URL (gestion-estrategica
// → estrategico).
export function primerHijoPermitidoGuard(
  nodo: string,
  opciones: PrimerHijoPermitidoOpciones = {},
): CanActivateFn {
  return (route, state) => {
    const menuService = inject(MenuService);
    const router = inject(Router);

    return menuService.getTree().pipe(
      map((tree) => {
        const destino = elegirDestino(hojasPermitidas(tree, nodo), opciones);
        if (!destino) return router.createUrlTree(['/home']);

        const urlTree = router.createUrlTree(['/', ...segmentosBase(route), ...destino]);
        // Anti-bucle: si el backend manda una hoja que el front todavia no
        // tiene como ruta, el '**' volveria a caer aca para siempre.
        const urlSolicitada = state.url.split(/[?#]/)[0];
        return router.serializeUrl(urlTree) === urlSolicitada
          ? router.createUrlTree(['/home'])
          : urlTree;
      }),
      catchError(() => of(router.createUrlTree(['/auth']))),
    );
  };
}

function elegirDestino(
  hojas: string[][],
  { preferido, fallback }: PrimerHijoPermitidoOpciones,
): string[] | null {
  const hojaPreferida = hojas.find((hoja) => hoja.join('/') === preferido);
  if (hojaPreferida) return hojaPreferida;
  if (hojas.length > 0) return hojas[0];
  return fallback ? fallback.split('/') : null;
}

// Segmentos de URL hasta el padre de esta ruta: se usa el padre para dejar
// fuera lo que consumio el propio '**'. Sirve tambien para grupos cargados
// con loadChildren (catalogo, negocio, ti), cuyo padre ya trae su segmento.
function segmentosBase(route: ActivatedRouteSnapshot): string[] {
  return (route.parent?.pathFromRoot ?? []).flatMap((tramo) =>
    tramo.url.map((segmento) => segmento.path),
  );
}
