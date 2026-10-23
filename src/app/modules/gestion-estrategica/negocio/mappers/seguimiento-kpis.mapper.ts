import { CumplimientoDto, SeguimientoKpisDto } from '../interfaces/seguimiento-kpis-dto.interface';
import { Cumplimiento, SeguimientoKpis } from '../interfaces/seguimiento-kpis.interface';
import { TableroColorSemaforo } from '../interfaces/tablero-control.interface';

const COLORES_SEMAFORO = new Set<TableroColorSemaforo>(['VERDE', 'AMARILLO', 'ROJO']);

export function toSeguimientoKpis(dto: SeguimientoKpisDto): SeguimientoKpis {
  return {
    planId: dto.plan.id,
    planNombre: dto.plan.nombre,
    cumplimientoGeneral: toCumplimiento(dto.cumplimiento_general),
    perspectivas: dto.perspectivas.map((perspectiva, indice) => ({
      id: perspectiva.id,
      nombre: perspectiva.nombre,
      orden: indice + 1,
      cumplimiento: toCumplimiento(perspectiva.cumplimiento),
      kpis: perspectiva.objetivos.flatMap((objetivo) =>
        objetivo.kpis.map((kpi) => {
          const ultimoValor = kpi.ultimo_valor
            ? {
                anio: kpi.ultimo_valor.anio,
                periodoCodigo: kpi.ultimo_valor.periodo.codigo,
                periodoNombre: kpi.ultimo_valor.periodo.nombre,
                valor: kpi.ultimo_valor.valor,
                color: colorSemaforo(kpi.ultimo_valor.semaforo_color),
              }
            : null;
          return {
            kpiId: kpi.id,
            codigo: kpi.codigo,
            nombre: kpi.nombre,
            frecuenciaNombre: kpi.frecuencia.nombre,
            unidadSimbolo: kpi.unidad_medida.simbolo.trim() || kpi.unidad_medida.nombre,
            operador: kpi.operador,
            avancePct: kpi.avance_pct,
            ultimoValor,
            metaUltimoAnio:
              kpi.metas_anuales.find((meta) => meta.anio === ultimoValor?.anio)?.meta ?? null,
            serie: kpi.serie.map((punto) => ({
              anio: punto.anio,
              periodoCodigo: punto.periodo.codigo,
              periodoNombre: punto.periodo.nombre,
              valor: punto.valor,
              meta: punto.meta,
              color: colorSemaforo(punto.semaforo_color),
            })),
          };
        }),
      ),
    })),
  };
}

function toCumplimiento(dto: CumplimientoDto): Cumplimiento {
  return {
    porcentaje: dto.porcentaje_promedio,
    evaluados: dto.kpis_evaluados,
    total: dto.total_kpis,
    verde: dto.kpis_verde,
    amarillo: dto.kpis_amarillo,
    rojo: dto.kpis_rojo,
    sinDato: dto.kpis_sin_dato,
  };
}

function colorSemaforo(color: string | null): TableroColorSemaforo | null {
  return color !== null && COLORES_SEMAFORO.has(color as TableroColorSemaforo)
    ? (color as TableroColorSemaforo)
    : null;
}
