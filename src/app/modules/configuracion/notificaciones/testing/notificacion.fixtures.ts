import { CanalNotificacionDto, PlantillaCorreoDto } from '../interfaces/notificacion-dto.interface';

export function makeCanalEmailDto(
  overrides: Partial<CanalNotificacionDto> = {},
): CanalNotificacionDto {
  return {
    tipo: 'email',
    activo: true,
    remitente: 'no-reply@francos.pe',
    servidor_smtp: 'smtp.francos.pe:587',
    seguridad: 'STARTTLS',
    updated_at: '2026-09-14T12:00:00.000Z',
    ...overrides,
  };
}

export function makeCanalPortalDto(
  overrides: Partial<CanalNotificacionDto> = {},
): CanalNotificacionDto {
  return {
    tipo: 'portal',
    activo: true,
    remitente: null,
    servidor_smtp: null,
    seguridad: null,
    destinatarios: 'Clientes del Portal B',
    updated_at: '2026-09-14T12:00:00.000Z',
    ...overrides,
  };
}

export function makePlantillaDto(overrides: Partial<PlantillaCorreoDto> = {}): PlantillaCorreoDto {
  return {
    clave: 'verificacion_email',
    nombre: 'Verificación de email',
    destinatario: 'Cliente',
    asunto: "Verifica tu correo en Franco's",
    cuerpo: 'Hola {{nombre}}, confirma tu correo en {{enlace}}.',
    variables: ['nombre', 'enlace'],
    updated_at: '2026-09-14T12:00:00.000Z',
    ...overrides,
  };
}
