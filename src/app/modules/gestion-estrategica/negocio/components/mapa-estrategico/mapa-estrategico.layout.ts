import {
  ObjetivoEstrategico,
  PerspectivaBsc,
} from '../../interfaces/objetivo-estrategico.interface';

export const ALTO_FRANJA = 150;
export const ANCHO_ETIQUETA = 96;
export const ANCHO_TARJETA = 200;
export const ALTO_TARJETA = 84;
export const SEPARACION_X = 48;
export const MARGEN_X = 32;
export const SEPARACION_ANCLAS = 22;

export interface MapaFranja {
  perspectiva: PerspectivaBsc;
  top: number;
  alto: number;
}

export interface MapaTarjeta {
  objetivo: ObjetivoEstrategico;
  x: number;
  y: number;
  indiceFranja: number;
}

export interface MapaRelacion {
  origenId: number;
  destinoId: number;
  d: string;
}

export interface MapaLayout {
  franjas: MapaFranja[];
  tarjetas: MapaTarjeta[];
  relaciones: MapaRelacion[];
  ancho: number;
  alto: number;
}

type LadoTarjeta = 't' | 'b';

interface RelacionBase {
  origenId: number;
  destinoId: number;
  ladoOrigen: LadoTarjeta;
  ladoDestino: LadoTarjeta;
}

export function calcularMapa(
  perspectivas: PerspectivaBsc[],
  objetivos: ObjetivoEstrategico[],
): MapaLayout {
  const perspectivasOrdenadas = [...perspectivas].sort((a, b) => a.orden - b.orden);
  const franjas = perspectivasOrdenadas.map((perspectiva, indice) => ({
    perspectiva,
    top: indice * ALTO_FRANJA,
    alto: ALTO_FRANJA,
  }));
  const objetivosPorFranja = perspectivasOrdenadas.map((perspectiva) =>
    objetivos.filter((objetivo) => objetivo.perspectivaId === perspectiva.id),
  );
  const maxColumnas = Math.max(
    1,
    ...objetivosPorFranja.map((objetivosFranja) => objetivosFranja.length),
  );
  const tarjetas = objetivosPorFranja.flatMap((objetivosFranja, indiceFranja) =>
    objetivosFranja.map((objetivo, indiceColumna) => ({
      objetivo,
      x: ANCHO_ETIQUETA + MARGEN_X + indiceColumna * (ANCHO_TARJETA + SEPARACION_X),
      y: indiceFranja * ALTO_FRANJA + (ALTO_FRANJA - ALTO_TARJETA) / 2,
      indiceFranja,
    })),
  );
  const tarjetaPorObjetivo = new Map(tarjetas.map((tarjeta) => [tarjeta.objetivo.id, tarjeta]));
  const relacionesBase: RelacionBase[] = [];

  for (const objetivo of objetivos) {
    const origen = tarjetaPorObjetivo.get(objetivo.id);
    if (!origen) continue;

    for (const destinoId of objetivo.relacionesDestinoIds) {
      const destino = tarjetaPorObjetivo.get(destinoId);
      if (!destino) continue;

      const [ladoOrigen, ladoDestino]: [LadoTarjeta, LadoTarjeta] =
        destino.indiceFranja < origen.indiceFranja
          ? ['t', 'b']
          : destino.indiceFranja > origen.indiceFranja
            ? ['b', 't']
            : ['t', 't'];
      relacionesBase.push({ origenId: objetivo.id, destinoId, ladoOrigen, ladoDestino });
    }
  }

  const anclas = new Map<string, number[]>();
  const agregarAncla = (id: number, lado: LadoTarjeta, indiceRelacion: number): void => {
    const clave = `${id}:${lado}`;
    const indices = anclas.get(clave) ?? [];
    indices.push(indiceRelacion);
    anclas.set(clave, indices);
  };

  relacionesBase.forEach((relacion, indice) => {
    agregarAncla(relacion.origenId, relacion.ladoOrigen, indice);
    agregarAncla(relacion.destinoId, relacion.ladoDestino, indice);
  });

  const xAncla = (id: number, lado: LadoTarjeta, indiceRelacion: number): number => {
    const tarjeta = tarjetaPorObjetivo.get(id)!;
    const indices = anclas.get(`${id}:${lado}`)!;
    const posicion = indices.indexOf(indiceRelacion);
    return (
      tarjeta.x + ANCHO_TARJETA / 2 + (posicion - (indices.length - 1) / 2) * SEPARACION_ANCLAS
    );
  };

  const relaciones = relacionesBase.map((relacion, indice) => {
    const origen = tarjetaPorObjetivo.get(relacion.origenId)!;
    const destino = tarjetaPorObjetivo.get(relacion.destinoId)!;
    const x1 = xAncla(relacion.origenId, relacion.ladoOrigen, indice);
    const y1 = relacion.ladoOrigen === 't' ? origen.y : origen.y + ALTO_TARJETA;
    const x2 = xAncla(relacion.destinoId, relacion.ladoDestino, indice);
    const y2 = relacion.ladoDestino === 't' ? destino.y - 6 : destino.y + ALTO_TARJETA + 6;
    const d =
      relacion.ladoOrigen === relacion.ladoDestino
        ? (() => {
            const yc = Math.min(y1, y2) - 34;
            return `M${x1} ${y1} C${x1} ${yc} ${x2} ${yc} ${x2} ${y2}`;
          })()
        : (() => {
            const ym = (y1 + y2) / 2;
            return `M${x1} ${y1} C${x1} ${ym} ${x2} ${ym} ${x2} ${y2}`;
          })();

    return {
      origenId: relacion.origenId,
      destinoId: relacion.destinoId,
      d,
    };
  });

  return {
    franjas,
    tarjetas,
    relaciones,
    ancho:
      ANCHO_ETIQUETA +
      MARGEN_X * 2 +
      maxColumnas * ANCHO_TARJETA +
      (maxColumnas - 1) * SEPARACION_X,
    alto: franjas.length * ALTO_FRANJA,
  };
}

export function relacionadosCon(id: number, relaciones: MapaRelacion[]): Set<number> {
  const relacionados = new Set([id]);

  for (const relacion of relaciones) {
    if (relacion.origenId === id) relacionados.add(relacion.destinoId);
    if (relacion.destinoId === id) relacionados.add(relacion.origenId);
  }

  return relacionados;
}
