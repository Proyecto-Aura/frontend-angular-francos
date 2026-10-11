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
  const arbol: RutaNodo[] = [
    {
      id: 1,
      nombre: 'inventario',
      etiqueta: 'Inventario',
      icono: 'package',
      descripcion: 'Control de stock y productos',
      estado: true,
      parent_id: null,
      children: [
        { ...leaf('insumos'), children: [leaf('stock-insumos'), leaf('solicitudes-insumos')] },
      ],
    },
  ];

  it('finds the root node', () => {
    expect(existeNombreEnArbol(arbol, 'inventario')).toBe(true);
  });

  it('finds a deeply nested leaf node', () => {
    expect(existeNombreEnArbol(arbol, 'stock-insumos')).toBe(true);
  });

  it('returns false for a nombre not permitted (not in the filtered tree)', () => {
    expect(existeNombreEnArbol(arbol, 'stock-productos')).toBe(false);
  });
});
