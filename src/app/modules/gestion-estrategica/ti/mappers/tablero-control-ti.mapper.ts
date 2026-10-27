import { TableroColorSemaforo } from '../../negocio/interfaces/tablero-control.interface';
import { toIniciativa } from '../../negocio/mappers/iniciativa.mapper';
import { TableroControlTiDto } from '../interfaces/tablero-control-ti-dto.interface';
import { TableroControlTi } from '../interfaces/tablero-control-ti.interface';

const COLORES_SEMAFORO = new Set<TableroColorSemaforo>(['VERDE', 'AMARILLO', 'ROJO']);

export function toTableroControlTi(dto: TableroControlTiDto): TableroControlTi {
  return {
    planId: dto.plan.id,
    planNombre: dto.plan.nombre,
    anioInicio: dto.plan.anio_inicio,
    anioFin: dto.plan.anio_fin,
    perspectivas: dto.perspectivas.map((perspectiva, indice) => ({
      id: perspectiva.id,
      nombre: perspectiva.nombre,
      orden: indice + 1,
      kpis: perspectiva.objetivos.flatMap((objetivo) =>
        objetivo.kpis.map((kpi) => ({
          kpiId: kpi.id,
          codigo: kpi.codigo,
          nombre: kpi.nombre,
          formula: kpi.formula,
          unidadSimbolo: kpi.unidad_medida.simbolo.trim() || kpi.unidad_medida.nombre,
          frecuenciaNombre: kpi.frecuencia.nombre,
          objetivoCodigo: objetivo.codigo,
          objetivoNombre: objetivo.nombre,
          oeNegocio: objetivo.oe_negocio
            ? {
                id: objetivo.oe_negocio.id,
                codigo: objetivo.oe_negocio.codigo,
                nombre: objetivo.oe_negocio.nombre,
              }
            : null,
          responsable: objetivo.responsable,
          iniciativas: objetivo.iniciativas.map(toIniciativa),
          anios: kpi.valores_por_anio.map((valor) => ({
            anio: valor.anio,
            meta: valor.meta,
            periodo: valor.periodo
              ? { codigo: valor.periodo.codigo, nombre: valor.periodo.nombre }
              : null,
            valor: valor.valor,
            color: esColorSemaforo(valor.semaforo_color) ? valor.semaforo_color : null,
          })),
        })),
      ),
    })),
  };
}

function esColorSemaforo(color: string | null): color is TableroColorSemaforo {
  return color !== null && COLORES_SEMAFORO.has(color as TableroColorSemaforo);
}
