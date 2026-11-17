import { RutaNodo } from '../../../../core/interfaces/ruta-nodo.interface';

/** Una fila del árbol de permisos, ya con su sangría y su estado. */
export interface FilaPermiso {
  nodo: RutaNodo;
  nivel: number;
  tieneHijos: boolean;
  expandido: boolean;
  /** Tiene acceso: la ruta misma o alguna de sus pantallas hijas. */
  activo: boolean;
}

/** Ids del nodo y de todo lo que cuelga de él. */
export function idsDelNodo(nodo: RutaNodo): number[] {
  return [nodo.id, ...nodo.children.flatMap(idsDelNodo)];
}

/** Solo las rutas vigentes: una ruta dada de baja no se ofrece para otorgar. */
export function soloVigentes(nodos: RutaNodo[]): RutaNodo[] {
  return nodos
    .filter((nodo) => nodo.estado)
    .map((nodo) => ({ ...nodo, children: soloVigentes(nodo.children) }));
}

export function nodoTieneAcceso(nodo: RutaNodo, accesos: ReadonlySet<number>): boolean {
  return idsDelNodo(nodo).some((id) => accesos.has(id));
}

/** Aplana el árbol dejando solo las filas visibles (las de ramas expandidas). */
export function filasDePermisos(
  nodos: RutaNodo[],
  accesos: ReadonlySet<number>,
  expandidos: ReadonlySet<number>,
  nivel = 0,
): FilaPermiso[] {
  return nodos.flatMap((nodo) => {
    const tieneHijos = nodo.children.length > 0;
    const expandido = tieneHijos && expandidos.has(nodo.id);
    const fila: FilaPermiso = {
      nodo,
      nivel,
      tieneHijos,
      expandido,
      activo: nodoTieneAcceso(nodo, accesos),
    };
    return expandido
      ? [fila, ...filasDePermisos(nodo.children, accesos, expandidos, nivel + 1)]
      : [fila];
  });
}

/**
 * Prende o apaga una ruta junto con todo lo que cuelga de ella. Los padres no
 * se tocan: el menú ya muestra los ancestros de cualquier ruta permitida.
 */
export function alternarAcceso(nodo: RutaNodo, accesos: ReadonlySet<number>): Set<number> {
  const siguiente = new Set(accesos);
  const ids = idsDelNodo(nodo);
  if (nodoTieneAcceso(nodo, accesos)) ids.forEach((id) => siguiente.delete(id));
  else ids.forEach((id) => siguiente.add(id));
  return siguiente;
}

/** Ids de todos los nodos que tienen hijos (para "Expandir todo"). */
export function idsExpandibles(nodos: RutaNodo[]): number[] {
  return nodos.flatMap((nodo) =>
    nodo.children.length > 0 ? [nodo.id, ...idsExpandibles(nodo.children)] : [],
  );
}

export function diferencia(a: ReadonlySet<number>, b: ReadonlySet<number>): number[] {
  return [...a].filter((id) => !b.has(id));
}
