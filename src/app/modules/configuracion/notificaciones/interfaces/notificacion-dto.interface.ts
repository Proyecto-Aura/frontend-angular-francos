// FNC-43 (RF-A185 a RF-A188). Shape confirmado por el backend (rama
// feature/OFT0-285-gestionar-parametros-notificaciones de su repo, local
// todavía): base /api/v1/parametros-notificaciones, todo rol admin.
// Datos SMTP de solo lectura, calculados por el backend desde la configuracion
// real: SMTP_FROM, SMTP_HOST y SMTP_SECURE (TLS o STARTTLS).
// El PATCH del canal solo acepta activo y destinatarios.

export type CanalNotificacionTipoDto = 'email' | 'portal';

export interface CanalNotificacionDto {
  tipo: CanalNotificacionTipoDto;
  activo: boolean;
  // Solo para tipo "email".
  readonly remitente: string | null;
  readonly servidor_smtp: string | null;
  readonly seguridad: string | null;
  // Solo para tipo "portal".
  destinatarios?: string | null;
  updated_at: string;
}

// Todos opcionales: el backend solo actualiza lo que llega.
export interface ActualizarCanalRequestDto {
  activo?: boolean;
  destinatarios?: string;
}

export interface PlantillaCorreoDto {
  clave: string;
  nombre: string;
  destinatario: string;
  variables: string[];
  asunto: string;
  cuerpo: string;
  updated_at: string;
}

// Opcionales: el backend solo actualiza lo que llega. Si el cuerpo usa una
// variable {{x}} que no está en `variables` de esa plantilla, responde 400.
export interface ActualizarPlantillaRequestDto {
  asunto?: string;
  cuerpo?: string;
}
