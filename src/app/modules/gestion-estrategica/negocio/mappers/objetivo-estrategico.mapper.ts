import {
  ActualizarObjetivoEstrategicoRequestDto,
  CrearObjetivoEstrategicoRequestDto,
  ObjetivoEstrategicoDto,
  PerspectivaBscDto,
  ResumenObjetivosPlanDto,
} from '../interfaces/objetivo-estrategico-dto.interface';
import {
  ObjetivoEstrategico,
  ObjetivoEstrategicoForm,
  PerspectivaBsc,
} from '../interfaces/objetivo-estrategico.interface';

export function toPerspectivaBsc(dto: PerspectivaBscDto): PerspectivaBsc {
  return {
    id: dto.id,
    nombre: dto.nombre,
    orden: dto.orden,
  };
}

export function toObjetivoEstrategico(dto: ObjetivoEstrategicoDto): ObjetivoEstrategico {
  return {
    id: dto.id,
    codigo: dto.codigo,
    planId: dto.plan_estrategico_id,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    responsable: dto.responsable,
    perspectivaId: dto.perspectiva_bsc_id,
    perspectivaNombre: dto.perspectiva_bsc.nombre,
    perspectivaOrden: dto.perspectiva_bsc.orden,
    estadoCodigo: dto.estado_objetivo.codigo,
    estadoNombre: dto.estado_objetivo.nombre,
    relacionesDestinoIds: [...dto.relaciones_destino_ids],
  };
}

export function toObjetivosDeResumen(resumenDto: ResumenObjetivosPlanDto): ObjetivoEstrategico[] {
  return resumenDto.perspectivas.flatMap(({ objetivos }) => objetivos.map(toObjetivoEstrategico));
}

export function toCrearObjetivoRequest(
  planId: number,
  form: ObjetivoEstrategicoForm,
): CrearObjetivoEstrategicoRequestDto {
  const descripcion = form.descripcion.trim();

  return {
    plan_estrategico_id: planId,
    perspectiva_bsc_id: form.perspectivaId!,
    nombre: form.nombre.trim(),
    ...(descripcion ? { descripcion } : {}),
    responsable: form.responsable.trim(),
    relaciones_destino_ids: [...form.relacionesDestinoIds],
  };
}

export function toActualizarObjetivoRequest(
  form: ObjetivoEstrategicoForm,
): ActualizarObjetivoEstrategicoRequestDto {
  return {
    perspectiva_bsc_id: form.perspectivaId!,
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    responsable: form.responsable.trim(),
    relaciones_destino_ids: [...form.relacionesDestinoIds],
  };
}
