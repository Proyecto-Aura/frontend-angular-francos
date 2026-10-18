import {
  ActualizarIniciativaRequestDto,
  CrearIniciativaRequestDto,
  IniciativaDto,
} from '../interfaces/iniciativa-dto.interface';
import { Iniciativa, IniciativaForm } from '../interfaces/iniciativa.interface';

export function toIniciativa(dto: IniciativaDto): Iniciativa {
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    responsable: dto.responsable,
    fechaInicio: dto.fecha_inicio.slice(0, 10),
    fechaFin: dto.fecha_fin.slice(0, 10),
    estadoCodigo: dto.estado_iniciativa.codigo,
    estadoNombre: dto.estado_iniciativa.nombre,
    objetivoId: dto.objetivo.id,
    objetivoNombre: dto.objetivo.nombre,
    perspectivaId: dto.objetivo.perspectiva.id,
    perspectivaNombre: dto.objetivo.perspectiva.nombre,
  };
}

export function toIniciativas(dtos: IniciativaDto[]): Iniciativa[] {
  return dtos.map(toIniciativa);
}

export function toCrearIniciativaRequest(form: IniciativaForm): CrearIniciativaRequestDto {
  const request: CrearIniciativaRequestDto = {
    objetivo_estrategico_id: form.objetivoId as number,
    nombre: form.nombre.trim(),
    responsable: form.responsable.trim(),
    fecha_inicio: form.fechaInicio,
    fecha_fin: form.fechaFin,
  };
  const descripcion = form.descripcion.trim();
  if (descripcion) request.descripcion = descripcion;
  return request;
}

export function toActualizarIniciativaRequest(
  form: IniciativaForm,
): ActualizarIniciativaRequestDto {
  const request: ActualizarIniciativaRequestDto = {
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim(),
    responsable: form.responsable.trim(),
    fecha_inicio: form.fechaInicio,
    fecha_fin: form.fechaFin,
  };
  return request;
}
