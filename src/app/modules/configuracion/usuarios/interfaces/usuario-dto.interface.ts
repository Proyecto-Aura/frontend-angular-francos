// Formas reales de los endpoints /usuarios, /roles y /roles/:id/rutas.
export type TipoDocumentoDto = 'dni' | 'ce' | 'pasaporte' | 'ruc';

export interface RolResumenDto {
  id: number;
  nombre: string;
}

export interface UsuarioInternoDto {
  id: string;
  persona_id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: TipoDocumentoDto;
  numero_documento: string;
  email: string;
  username: string;
  estado: boolean;
  email_verificado: boolean;
  debe_cambiar_contrasena: boolean;
  roles: RolResumenDto[];
  created_at: string;
  updated_at: string;
}

export interface PaginaUsuariosDto {
  data: UsuarioInternoDto[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

export interface RolDto {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

export interface ListaRolesDto {
  data: RolDto[];
}

export interface AccesoDto {
  id: number;
  rol_id: number;
  ruta_id: number;
  estado: boolean;
}

export interface CrearUsuarioRequestDto {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: TipoDocumentoDto;
  numero_documento: string;
  email: string;
  username: string;
  contrasena: string;
  estado: boolean;
  rol_ids: number[];
}

export interface ActualizarUsuarioRequestDto {
  username?: string;
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  contrasena?: string;
}
