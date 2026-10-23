// Formas exactas que devuelve el backend (basado en la tabla User).
// OJO: el backend nunca debería incluir "contraseña" en una respuesta —
// se modela aquí solo para dejar constancia de qué NO se debe mapear ni usar.
// No forma parte de la respuesta de /auth/login (ver LoginResponseDto) — queda
// para cuando se integre algo como /personas o un endpoint de "usuario actual".

export interface UsuarioDto {
  id: number;
  email: string;
  username: string;
  estado: 'activo' | 'inactivo';
  persona_id: number;
  created_at: string;
  updated_at: string;
}

// POST /api/v1/auth/login — "identificador" acepta email o username indistintamente.
export interface LoginRequestDto {
  identificador: string;
  password: string;
}

// Respuesta real de POST /api/v1/auth/login (confirmado por el backend).
// No incluye datos del usuario: el refresh_token viaja aparte en una cookie
// httpOnly (path /api/v1/auth), nunca en este body.
export interface LoginResponseDto {
  access_token: string;
  roles: string[];
  email_verificado: boolean;
  debe_cambiar_contrasena: boolean;
}

// GET /api/v1/auth/me — cualquier usuario autenticado (no solo admin).
// "roles" viene crudo tal cual esta en la BD (ej. "admin", "ventas"), sin
// labels bonitos — eso lo resuelve el front si hace falta.
export interface MeResponseDto {
  nombre_completo: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  username: string;
  roles: string[];
}
