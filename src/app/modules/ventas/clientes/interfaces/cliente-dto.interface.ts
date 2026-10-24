// Formas exactas de GET/PATCH/DELETE /api/v1/clientes y de
// POST /api/v1/auth/register/cliente (alta de cliente por staff).
export type TipoDocumentoDto = 'dni' | 'ce' | 'pasaporte' | 'ruc';
export type TipoClienteDto = 'persona_natural' | 'empresa';
export type CategoriaClienteDto = 'minorista' | 'mayorista';

// Ubicación del cliente según el catálogo de ubigeo; null si no la registró.
export interface UbigeoItemDto {
  id: string;
  nombre: string;
}

export interface UbicacionDto {
  departamento: UbigeoItemDto;
  provincia: UbigeoItemDto;
  distrito: UbigeoItemDto;
}

// El correo vive en la cuenta de acceso (User), no en Persona: es null si el
// cliente no tiene cuenta. fecha_nacimiento llega como ISO completo.
export interface ClienteDto {
  id: string;
  /** Código visible, por ejemplo "CLI-000001". */
  codigo: string;
  persona_id: string;
  tipo_cliente: TipoClienteDto;
  razon_social: string | null;
  categoria_cliente: CategoriaClienteDto;
  estado: boolean;
  created_at: string;
  updated_at: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: TipoDocumentoDto;
  numero_documento: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  ubicacion: UbicacionDto | null;
  email: string | null;
}

export interface ClientesPageDto {
  data: ClienteDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// Body de POST /api/v1/auth/register/cliente. El backend rechaza con 400 las
// propiedades que no conoce, por eso los opcionales se omiten cuando están
// vacíos (nunca se mandan como "" ni null). usuario y contraseña NO van: el
// backend los genera (ambos = número de documento) y los envía por correo.
export interface RegistrarClienteRequestDto {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: TipoDocumentoDto;
  numero_documento: string;
  telefono?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  /** Código de distrito (6 dígitos); el backend deduce provincia y departamento. */
  distrito_id?: string;
  tipo_cliente: TipoClienteDto;
  razon_social?: string;
  categoria_cliente: CategoriaClienteDto;
  email: string;
}

// Body de PATCH /api/v1/clientes/:id — todo opcional, sin email (pertenece a la
// cuenta de acceso). tipo_documento y numero_documento van siempre juntos.
export type ActualizarClienteRequestDto = Partial<Omit<RegistrarClienteRequestDto, 'email'>>;

export interface RegistroClienteResponseDto {
  id: string;
  email: string;
  username: string;
  email_verificado: boolean;
  debe_cambiar_contrasena: boolean;
}
