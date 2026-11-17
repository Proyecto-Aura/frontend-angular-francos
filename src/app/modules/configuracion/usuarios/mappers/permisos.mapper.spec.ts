import { RutaNodo } from '../../../../core/interfaces/ruta-nodo.interface';
import { makeNodo } from '../testing/usuario-fixtures';
import {
  alternarAcceso,
  diferencia,
  filasDePermisos,
  idsDelNodo,
  idsExpandibles,
  nodoTieneAcceso,
  soloVigentes,
} from './permisos.mapper';

// ventas(1) -> catalogo(2) -> configuracion-catalogo(3); ventas -> clientes(4)
const arbol: RutaNodo[] = [
  makeNodo({
    id: 1,
    nombre: 'ventas',
    children: [
      makeNodo({
        id: 2,
        nombre: 'catalogo',
        parent_id: 1,
        children: [makeNodo({ id: 3, nombre: 'configuracion-catalogo', parent_id: 2 })],
      }),
      makeNodo({ id: 4, nombre: 'clientes', parent_id: 1 }),
    ],
  }),
];

describe('permisos.mapper', () => {
  it('idsDelNodo incluye el nodo y todo lo que cuelga de él', () => {
    expect(idsDelNodo(arbol[0])).toEqual([1, 2, 3, 4]);
  });

  it('soloVigentes quita las rutas dadas de baja, con sus hijas', () => {
    const conBaja = [
      makeNodo({
        id: 1,
        children: [
          makeNodo({ id: 2, estado: false, children: [makeNodo({ id: 3 })] }),
          makeNodo({ id: 4 }),
        ],
      }),
    ];

    expect(idsDelNodo(soloVigentes(conBaja)[0])).toEqual([1, 4]);
  });

  it('un módulo tiene acceso si alguna de sus pantallas lo tiene', () => {
    expect(nodoTieneAcceso(arbol[0], new Set([3]))).toBe(true);
    expect(nodoTieneAcceso(arbol[0], new Set([99]))).toBe(false);
  });

  it('filasDePermisos solo muestra las ramas expandidas, con su nivel', () => {
    const cerrado = filasDePermisos(arbol, new Set(), new Set());
    expect(cerrado.map((f) => f.nodo.id)).toEqual([1]);

    const abierto = filasDePermisos(arbol, new Set([4]), new Set([1, 2]));
    expect(abierto.map((f) => [f.nodo.id, f.nivel])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 1],
    ]);
    expect(abierto.find((f) => f.nodo.id === 1)?.activo).toBe(true);
    expect(abierto.find((f) => f.nodo.id === 2)?.activo).toBe(false);
  });

  it('alternarAcceso prende toda la rama y, estando prendida, la apaga', () => {
    const prendido = alternarAcceso(arbol[0], new Set());
    expect([...prendido].sort()).toEqual([1, 2, 3, 4]);

    expect([...alternarAcceso(arbol[0], prendido)]).toEqual([]);
  });

  it('alternarAcceso en una pantalla no toca a sus padres', () => {
    const catalogo = arbol[0].children[0];

    expect([...alternarAcceso(catalogo, new Set())].sort()).toEqual([2, 3]);
  });

  it('idsExpandibles lista solo los nodos con hijos', () => {
    expect(idsExpandibles(arbol)).toEqual([1, 2]);
  });

  it('diferencia devuelve lo que está en a y no en b', () => {
    expect(diferencia(new Set([1, 2, 3]), new Set([2]))).toEqual([1, 3]);
  });
});
