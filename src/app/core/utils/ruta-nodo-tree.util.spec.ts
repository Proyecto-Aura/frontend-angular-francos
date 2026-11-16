import { existeNombreEnArbol } from './ruta-nodo-tree.util';
import { RutaNodo } from '../interfaces/ruta-nodo.interface';

function leaf(nombre: string): RutaNodo {
  return {
    id: 1,
    nombre,
    etiqueta: nombre,
    icono: 'box',
    descripcion: null,
    estado: true,
    parent_id: 1,
    children: [],
  };
}

describe('existeNombreEnArbol', () => {
  // Menu de un usuario con rol "insumos": modulo de primer nivel con sus
  // paginas como hojas directas.
  const arbol: RutaNodo[] = [
    {
      id: 1,
      nombre: 'insumos',
      etiqueta: 'Insumos',
      icono: 'package',
      descripcion: 'Gestión de insumos y su stock',
      estado: true,
      parent_id: null,
      children: [leaf('stock-insumos'), leaf('solicitudes-insumos')],
    },
  ];

  it('finds the root node', () => {
    expect(existeNombreEnArbol(arbol, 'insumos')).toBe(true);
  });

  it('finds a leaf under a top-level module', () => {
    expect(existeNombreEnArbol(arbol, 'stock-insumos')).toBe(true);
  });

  it('returns false for a nombre not permitted (not in the filtered tree)', () => {
    expect(existeNombreEnArbol(arbol, 'stock-productos')).toBe(false);
  });

  it('finds a node nested several levels deep', () => {
    const profundo: RutaNodo[] = [
      { ...leaf('a'), parent_id: null, children: [{ ...leaf('b'), children: [leaf('c')] }] },
    ];
    expect(existeNombreEnArbol(profundo, 'c')).toBe(true);
  });
});
