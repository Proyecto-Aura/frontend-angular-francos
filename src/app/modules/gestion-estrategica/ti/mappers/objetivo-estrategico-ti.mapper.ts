import { toObjetivoEstrategico } from '../../negocio/mappers/objetivo-estrategico.mapper';
import {
  ActualizarObjetivoEstrategicoTiRequestDto,
  CrearObjetivoEstrategicoTiRequestDto,
  ObjetivoEstrategicoTiDto,
  ResumenObjetivosTiPlanDto,
} from '../interfaces/objetivo-estrategico-ti-dto.interface';
import {
  ObjetivoEstrategicoTi,
  ObjetivoEstrategicoTiForm,
} from '../interfaces/objetivo-estrategico-ti.interface';

export function toObjetivoEstrategicoTi(dto: ObjetivoEstrategicoTiDto): ObjetivoEstrategicoTi {
  return {
    ...toObjetivoEstrategico(dto),
    oeNegocioId: dto.oe_negocio_id,
    oeNegocio: dto.oe_negocio
      ? {
          id: dto.oe_negocio.id,
          codigo: dto.oe_negocio.codigo,
          nombre: dto.oe_negocio.nombre,
        }
      : null,
  };
}

export function toObjetivosTiDeResumen(
  resumen: ResumenObjetivosTiPlanDto,
): ObjetivoEstrategicoTi[] {
  return resumen.perspectivas.flatMap(({ objetivos }) => objetivos.map(toObjetivoEstrategicoTi));
}

export function toCrearObjetivoTiRequest(
  planId: number,
  form: ObjetivoEstrategicoTiForm,
): CrearObjetivoEstrategicoTiRequestDto {
  const descripcion = form.descripcion.trim();

  return {
    plan_estrategico_id: planId,
    perspectiva_bsc_id: form.perspectivaId!,
    nombre: form.nombre.trim(),
    ...(descripcion ? { descripcion } : {}),
    responsable: form.responsable.trim(),
    relaciones_destino_ids: [...form.relacionesDestinoIds],
    oe_negocio_id: form.oeNegocioId!,
  };
}

export function toActualizarObjetivoTiRequest(
  form: ObjetivoEstrategicoTiForm,
): ActualizarObjetivoEstrategicoTiRequestDto {
  return {
    perspectiva_bsc_id: form.perspectivaId!,
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    responsable: form.responsable.trim(),
    relaciones_destino_ids: [...form.relacionesDestinoIds],
    oe_negocio_id: form.oeNegocioId!,
  };
}
