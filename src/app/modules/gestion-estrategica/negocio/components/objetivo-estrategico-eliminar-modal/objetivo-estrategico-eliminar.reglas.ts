import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';

export interface RelacionesObjetivo {
  salientes: ObjetivoEstrategico[];
  entrantes: ObjetivoEstrategico[];
}

export function relacionesDeObjetivo(
  objetivo: ObjetivoEstrategico,
  objetivosDelPlan: ObjetivoEstrategico[],
): RelacionesObjetivo {
  const porId = new Map(
    objetivosDelPlan.map((objetivoDelPlan) => [objetivoDelPlan.id, objetivoDelPlan]),
  );
  const salientes = objetivo.relacionesDestinoIds
    .map((id) => porId.get(id))
    .filter(
      (objetivoRelacionado): objetivoRelacionado is ObjetivoEstrategico => !!objetivoRelacionado,
    );
  const entrantes = objetivosDelPlan.filter((objetivoDelPlan) =>
    objetivoDelPlan.relacionesDestinoIds.includes(objetivo.id),
  );

  return { salientes, entrantes };
}
