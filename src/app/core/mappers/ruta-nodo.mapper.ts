import { RutaNodo } from '../interfaces/ruta-nodo.interface';
import { SidebarLink } from '../../shared/ui/sidebar/sidebar';
import { resolveLucideIcon } from '../utils/lucide-icon-map';

// Arma el path de Angular acumulando el "nombre" (unico global) de cada nivel
// desde el hijo directo del modulo hacia abajo — funciona porque elegimos a
// propósito que los segmentos de ruta del front calcen con nombre (ver
// insumos.route.ts). Si en algun momento el path de una pagina deja de
// coincidir con su "nombre", este mapeo deja de servir para ese nodo.
export function mapRutaNodosToSidebarLinks(
  nodos: RutaNodo[],
  parentPath: string[] = [],
): SidebarLink[] {
  return nodos.map((nodo) => {
    const path = [...parentPath, nodo.nombre];
    const icon = resolveLucideIcon(nodo.icono);

    if (nodo.children.length > 0) {
      return {
        label: nodo.etiqueta,
        icon,
        children: mapRutaNodosToSidebarLinks(nodo.children, path),
      };
    }

    return {
      label: nodo.etiqueta,
      icon,
      path: path.join('/'),
    };
  });
}
