import { RutaNodo } from '../interfaces/ruta-nodo.interface';

// Busqueda recursiva en todo el arbol (no solo el primer nivel) — un nodo
// permitido puede estar varios niveles abajo de la raiz.
export function existeNombreEnArbol(nodos: RutaNodo[], nombre: string): boolean {
  return nodos.some(nodo => nodo.nombre === nombre || existeNombreEnArbol(nodo.children, nombre));
}
