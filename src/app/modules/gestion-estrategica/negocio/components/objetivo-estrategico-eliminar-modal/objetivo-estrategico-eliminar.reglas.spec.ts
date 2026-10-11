import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { relacionesDeObjetivo } from './objetivo-estrategico-eliminar.reglas';

function makeObjetivo(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 1,
    codigo: 'OE-0001',
    planId: 5,
    nombre: 'Objetivo uno',
    descripcion: null,
    responsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [],
    ...overrides,
  };
}

describe('relacionesDeObjetivo', () => {
  it('returns outgoing relationships in destination-id order', () => {
    const objetivo = makeObjetivo({ relacionesDestinoIds: [3, 2] });
    const objetivos = [objetivo, makeObjetivo({ id: 2 }), makeObjetivo({ id: 3 })];

    expect(relacionesDeObjetivo(objetivo, objetivos).salientes.map(({ id }) => id)).toEqual([3, 2]);
  });

  it('returns objectives that point to the selected objective as incoming relationships', () => {
    const objetivo = makeObjetivo();
    const objetivos = [
      objetivo,
      makeObjetivo({ id: 2, relacionesDestinoIds: [1] }),
      makeObjetivo({ id: 3, relacionesDestinoIds: [1, 2] }),
    ];

    expect(relacionesDeObjetivo(objetivo, objetivos).entrantes.map(({ id }) => id)).toEqual([2, 3]);
  });

  it('returns empty arrays when the objective has no relationships', () => {
    expect(relacionesDeObjetivo(makeObjetivo(), [makeObjetivo()])).toEqual({
      salientes: [],
      entrantes: [],
    });
  });

  it('ignores outgoing ids that are not in the plan', () => {
    const objetivo = makeObjetivo({ relacionesDestinoIds: [99, 2] });

    expect(
      relacionesDeObjetivo(objetivo, [objetivo, makeObjetivo({ id: 2 })]).salientes.map(
        ({ id }) => id,
      ),
    ).toEqual([2]);
  });
});
