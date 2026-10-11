import { mapRutaNodosToSidebarLinks } from './ruta-nodo.mapper';
import { RutaNodo } from '../interfaces/ruta-nodo.interface';
import { LucidePackage } from '@lucide/angular';

function makeLeaf(overrides: Partial<RutaNodo> = {}): RutaNodo {
  return {
    id: 1,
    nombre: 'stock-insumos',
    etiqueta: 'Stock de insumos',
    icono: 'boxes',
    descripcion: null,
    estado: true,
    parent_id: 2,
    children: [],
    ...overrides,
  };
}

describe('mapRutaNodosToSidebarLinks', () => {
  it('maps a leaf node (no children) to a link with a path built from its own nombre', () => {
    const [link] = mapRutaNodosToSidebarLinks([makeLeaf()]);
    expect(link.label).toBe('Stock de insumos');
    expect(link.path).toBe('stock-insumos');
    expect(link.children).toBeUndefined();
  });

  it('maps a node with children to a link with no path, recursing into its children', () => {
    const parent: RutaNodo = {
      id: 2,
      nombre: 'insumos',
      etiqueta: 'Insumos',
      icono: 'package',
      descripcion: null,
      estado: true,
      parent_id: 1,
      children: [makeLeaf(), makeLeaf({ id: 3, nombre: 'solicitudes-insumos', etiqueta: 'Solicitudes de insumos' })],
    };

    const [link] = mapRutaNodosToSidebarLinks([parent]);
    expect(link.path).toBeUndefined();
    expect(link.icon).toBe(LucidePackage);
    expect(link.children).toHaveLength(2);
  });

  it('builds the path by accumulating nombre from parent to leaf', () => {
    const parent: RutaNodo = {
      id: 2,
      nombre: 'insumos',
      etiqueta: 'Insumos',
      icono: 'package',
      descripcion: null,
      estado: true,
      parent_id: 1,
      children: [makeLeaf()],
    };

    const [link] = mapRutaNodosToSidebarLinks([parent]);
    expect(link.children?.[0].path).toBe('insumos/stock-insumos');
  });

  it('resolves icon to undefined (not a crash) for an unknown icono value', () => {
    const [link] = mapRutaNodosToSidebarLinks([makeLeaf({ icono: 'algo-inventado' })]);
    expect(link.icon).toBeUndefined();
  });
});
