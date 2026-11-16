import { RutaNodo } from '../interfaces/ruta-nodo.interface';

// Busqueda recursiva en todo el arbol (no solo el primer nivel) — un nodo
// permitido puede estar varios niveles abajo de la raiz.
export function existeNombreEnArbol(nodos: RutaNodo[], nombre: string): boolean {
  return nodos.some((nodo) => nodo.nombre === nombre || existeNombreEnArbol(nodo.children, nombre));
}

// Caminos relativos (en segmentos) de cada hoja bajo el nodo "nombre", en el
// orden del arbol — acumula los "nombre" de cada nivel desde el hijo directo
// hacia abajo, misma regla que mapRutaNodosToSidebarLinks. Nodo inexistente
// o que ya es hoja → [].
export function hojasPermitidas(nodos: RutaNodo[], nombre: string): string[][] {
  const nodo = buscarNodo(nodos, nombre);
  return nodo ? caminosDeHojas(nodo.children) : [];
}

function buscarNodo(nodos: RutaNodo[], nombre: string): RutaNodo | undefined {
  for (const nodo of nodos) {
    if (nodo.nombre === nombre) return nodo;
    const encontrado = buscarNodo(nodo.children, nombre);
    if (encontrado) return encontrado;
  }
  return undefined;
}

function caminosDeHojas(nodos: RutaNodo[], prefijo: string[] = []): string[][] {
  return nodos.flatMap((nodo) => {
    const camino = [...prefijo, nodo.nombre];
    return nodo.children.length > 0 ? caminosDeHojas(nodo.children, camino) : [camino];
  });
}
