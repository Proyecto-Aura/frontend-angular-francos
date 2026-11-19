import { CanalNotificacionDto, PlantillaCorreoDto } from '../interfaces/notificacion-dto.interface';
import { CanalEmail, CanalPortal, PlantillaCorreo } from '../interfaces/notificacion.interface';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function toCanalEmail(dto: CanalNotificacionDto): CanalEmail {
  return {
    activo: dto.activo,
    remitente: dto.remitente ?? '',
    servidorSmtp: dto.servidor_smtp ?? '',
    seguridad: dto.seguridad ?? '',
  };
}

export function toCanalPortal(dto: CanalNotificacionDto): CanalPortal {
  return {
    activo: dto.activo,
    destinatarios: dto.destinatarios ?? '',
  };
}

export function toPlantillaCorreo(dto: PlantillaCorreoDto): PlantillaCorreo {
  const fecha = new Date(dto.updated_at);
  return {
    clave: dto.clave,
    nombre: dto.nombre,
    destinatario: dto.destinatario,
    asunto: dto.asunto,
    cuerpo: dto.cuerpo,
    variables: dto.variables,
    actualizada: Number.isNaN(fecha.getTime()) ? '—' : FORMATO_FECHA.format(fecha),
  };
}
