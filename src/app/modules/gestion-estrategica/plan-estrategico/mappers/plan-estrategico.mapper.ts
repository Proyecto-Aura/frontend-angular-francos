import {
  ActualizarPlanEstrategicoRequestDto,
  CrearPlanEstrategicoRequestDto,
  PlanEstrategicoDto,
  PlanesEstrategicosPageDto,
} from '../interfaces/plan-estrategico-dto.interface';
import {
  PlanEstrategico,
  PlanEstrategicoForm,
  PlanesEstrategicosPagina,
} from '../interfaces/plan-estrategico.interface';

export function toPlanEstrategico(dto: PlanEstrategicoDto): PlanEstrategico {
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    anioInicio: dto.anio_inicio,
    anioFin: dto.anio_fin,
    estadoCodigo: dto.estado_plan.codigo,
    estadoNombre: dto.estado_plan.nombre,
    activo: dto.estado,
  };
}

export function toPlanesEstrategicosPagina(
  pageDto: PlanesEstrategicosPageDto,
): PlanesEstrategicosPagina {
  return {
    planes: pageDto.data.map(toPlanEstrategico),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

export function toActualizarPlanRequest(
  form: PlanEstrategicoForm,
): ActualizarPlanEstrategicoRequestDto {
  return {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    anio_inicio: Number(form.anioInicio),
    anio_fin: Number(form.anioFin),
  };
}

export function toCrearPlanRequest(form: PlanEstrategicoForm): CrearPlanEstrategicoRequestDto {
  const descripcion = form.descripcion.trim();

  return {
    nombre: form.nombre.trim(),
    ...(descripcion ? { descripcion } : {}),
    anio_inicio: Number(form.anioInicio),
    anio_fin: Number(form.anioFin),
  };
}
