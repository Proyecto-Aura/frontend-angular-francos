import { existeNombreEnArbol, hojasPermitidas } from './ruta-nodo-tree.util';
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

describe('hojasPermitidas', () => {
  it('returns the leaf paths of a module in menu order', () => {
    const arbol: RutaNodo[] = [
      { ...leaf('modulo'), parent_id: null, children: [leaf('a'), leaf('b'), leaf('c')] },
    ];
    expect(hojasPermitidas(arbol, 'modulo')).toEqual([['a'], ['b'], ['c']]);
  });

  it('accumulates group names for nested leaves', () => {
    const arbol: RutaNodo[] = [
      {
        ...leaf('modulo'),
        parent_id: null,
        children: [{ ...leaf('g'), children: [leaf('x'), leaf('y')] }, leaf('z')],
      },
    ];
    expect(hojasPermitidas(arbol, 'modulo')).toEqual([['g', 'x'], ['g', 'y'], ['z']]);
  });

  it('returns an empty list when the node does not exist', () => {
    const arbol: RutaNodo[] = [{ ...leaf('modulo'), parent_id: null, children: [leaf('a')] }];
    expect(hojasPermitidas(arbol, 'otro-modulo')).toEqual([]);
  });

  it('returns an empty list when the node is a leaf', () => {
    const arbol: RutaNodo[] = [{ ...leaf('modulo'), parent_id: null, children: [leaf('a')] }];
    expect(hojasPermitidas(arbol, 'a')).toEqual([]);
  });

  it('finds a node nested deeper than the first level', () => {
    const arbol: RutaNodo[] = [
      {
        ...leaf('estrategico'),
        parent_id: null,
        children: [
          {
            ...leaf('gestion-estrategica-negocio'),
            children: [leaf('objetivos-estrategicos'), leaf('gestionar-kpis')],
          },
          leaf('plan-estrategico'),
        ],
      },
    ];
    expect(hojasPermitidas(arbol, 'gestion-estrategica-negocio')).toEqual([
      ['objetivos-estrategicos'],
      ['gestionar-kpis'],
    ]);
  });
});
