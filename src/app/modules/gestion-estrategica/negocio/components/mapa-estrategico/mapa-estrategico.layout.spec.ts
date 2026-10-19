import {
  ObjetivoEstrategico,
  PerspectivaBsc,
} from '../../interfaces/objetivo-estrategico.interface';
import {
  ALTO_FRANJA,
  ALTO_TARJETA,
  ANCHO_ETIQUETA,
  ANCHO_TARJETA,
  MARGEN_X,
  SEPARACION_ANCLAS,
  SEPARACION_X,
  calcularMapa,
  relacionadosCon,
} from './mapa-estrategico.layout';

function makePerspectiva(overrides: Partial<PerspectivaBsc> = {}): PerspectivaBsc {
  return {
    id: 1,
    nombre: 'Financiera',
    orden: 1,
    ...overrides,
  };
}

function makeObjetivo(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 1,
    codigo: 'PE-0019-OE-N-001',
    planId: 5,
    nombre: 'Incrementar la rentabilidad',
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

const PERSPECTIVAS: PerspectivaBsc[] = [
  makePerspectiva({ id: 3, nombre: 'Procesos internos', orden: 3 }),
  makePerspectiva(),
  makePerspectiva({ id: 4, nombre: 'Aprendizaje y crecimiento', orden: 4 }),
  makePerspectiva({ id: 2, nombre: 'Clientes', orden: 2 }),
];

describe('mapaEstrategicoLayout', () => {
  it('creates every lane in perspective order, including empty lanes', () => {
    const layout = calcularMapa(PERSPECTIVAS, []);

    expect(layout.franjas.map(({ perspectiva }) => perspectiva.orden)).toEqual([1, 2, 3, 4]);
    expect(layout.franjas.map(({ top }) => top)).toEqual([0, 150, 300, 450]);
    expect(layout.franjas.every(({ alto }) => alto === ALTO_FRANJA)).toBe(true);
    expect(layout.alto).toBe(4 * ALTO_FRANJA);
  });

  it('positions cards by lane and received order', () => {
    const primero = makeObjetivo({ id: 20, nombre: 'Primero' });
    const segundo = makeObjetivo({ id: 10, nombre: 'Segundo' });
    const terceraFranja = makeObjetivo({
      id: 30,
      perspectivaId: 3,
      perspectivaNombre: 'Procesos internos',
      perspectivaOrden: 3,
    });
    const layout = calcularMapa(PERSPECTIVAS, [primero, segundo, terceraFranja]);

    expect(layout.tarjetas.map(({ objetivo }) => objetivo.id)).toEqual([20, 10, 30]);
    expect(layout.tarjetas[0]).toMatchObject({
      x: ANCHO_ETIQUETA + MARGEN_X,
      y: (ALTO_FRANJA - ALTO_TARJETA) / 2,
      indiceFranja: 0,
    });
    expect(layout.tarjetas[1].x).toBe(ANCHO_ETIQUETA + MARGEN_X + ANCHO_TARJETA + SEPARACION_X);
    expect(layout.tarjetas[2]).toMatchObject({
      x: ANCHO_ETIQUETA + MARGEN_X,
      y: 2 * ALTO_FRANJA + (ALTO_FRANJA - ALTO_TARJETA) / 2,
      indiceFranja: 2,
    });
  });

  it('ignores objectives whose perspective is not present', () => {
    const layout = calcularMapa(PERSPECTIVAS, [
      makeObjetivo(),
      makeObjetivo({ id: 99, perspectivaId: 99, perspectivaNombre: 'Desconocida' }),
    ]);

    expect(layout.tarjetas.map(({ objetivo }) => objetivo.id)).toEqual([1]);
  });

  it('uses the widest lane and a minimum of one column for canvas width', () => {
    const emptyLayout = calcularMapa(PERSPECTIVAS, []);
    const twoColumnLayout = calcularMapa(PERSPECTIVAS, [makeObjetivo(), makeObjetivo({ id: 2 })]);

    expect(emptyLayout.ancho).toBe(ANCHO_ETIQUETA + MARGEN_X * 2 + ANCHO_TARJETA);
    expect(twoColumnLayout.ancho).toBe(
      ANCHO_ETIQUETA + MARGEN_X * 2 + ANCHO_TARJETA * 2 + SEPARACION_X,
    );
  });

  it('creates relationships only when both endpoint cards exist', () => {
    const layout = calcularMapa(PERSPECTIVAS, [
      makeObjetivo({ relacionesDestinoIds: [2, 99] }),
      makeObjetivo({ id: 2, perspectivaId: 2, perspectivaNombre: 'Clientes', perspectivaOrden: 2 }),
      makeObjetivo({
        id: 3,
        perspectivaId: 99,
        perspectivaNombre: 'Desconocida',
        relacionesDestinoIds: [1],
      }),
    ]);

    expect(layout.relaciones).toHaveLength(1);
    expect(layout.relaciones[0]).toMatchObject({ origenId: 1, destinoId: 2 });
  });

  it('routes upward, downward, and same-lane relationships through the expected sides', () => {
    const superior = makeObjetivo();
    const inferior = makeObjetivo({
      id: 2,
      perspectivaId: 3,
      perspectivaNombre: 'Procesos internos',
      perspectivaOrden: 3,
    });
    const haciaAbajo = calcularMapa(PERSPECTIVAS, [
      { ...superior, relacionesDestinoIds: [2] },
      inferior,
    ]).relaciones[0];
    const haciaArriba = calcularMapa(PERSPECTIVAS, [
      superior,
      { ...inferior, relacionesDestinoIds: [1] },
    ]).relaciones[0];
    const mismaFranja = calcularMapa(PERSPECTIVAS, [
      { ...superior, relacionesDestinoIds: [3] },
      makeObjetivo({ id: 3 }),
    ]).relaciones[0];

    expect(haciaAbajo.d).toBe('M228 117 C228 222 228 222 228 327');
    expect(haciaArriba.d).toBe('M228 333 C228 228 228 228 228 123');
    expect(mismaFranja.d).toBe('M228 33 C228 -7 476 -7 476 27');
  });

  it('spreads multiple anchors on the same card side', () => {
    const layout = calcularMapa(PERSPECTIVAS, [
      makeObjetivo({ relacionesDestinoIds: [2, 3] }),
      makeObjetivo({ id: 2, perspectivaId: 2, perspectivaNombre: 'Clientes', perspectivaOrden: 2 }),
      makeObjetivo({
        id: 3,
        perspectivaId: 3,
        perspectivaNombre: 'Procesos internos',
        perspectivaOrden: 3,
      }),
    ]);
    const xOrigenes = layout.relaciones.map((relacion) =>
      Number(/^M(-?\d+(?:\.\d+)?) /.exec(relacion.d)?.[1]),
    );

    expect(xOrigenes).toEqual([217, 239]);
    expect(xOrigenes[1] - xOrigenes[0]).toBe(SEPARACION_ANCLAS);
  });

  it('finds outgoing and incoming neighbours without unrelated objectives', () => {
    const relacionados = relacionadosCon(2, [
      { origenId: 1, destinoId: 2, d: '' },
      { origenId: 2, destinoId: 3, d: '' },
      { origenId: 4, destinoId: 5, d: '' },
    ]);

    expect([...relacionados].sort()).toEqual([1, 2, 3]);
    expect(relacionados.has(4)).toBe(false);
  });
});
