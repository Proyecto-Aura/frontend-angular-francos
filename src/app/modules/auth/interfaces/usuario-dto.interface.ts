// Formas exactas que devuelve el backend (basado en la tabla User).
// OJO: el backend nunca debería incluir "contraseña" en una respuesta —
// se modela aquí solo para dejar constancia de qué NO se debe mapear ni usar.

export interface UsuarioDto {
  id: number;
  email: string;
  username: string;
  estado: 'activo' | 'inactivo';
  persona_id: number;
  created_at: string;
  updated_at: string;
}

export interface LoginResponseDto {
  token: string;
  usuario: UsuarioDto;
}
