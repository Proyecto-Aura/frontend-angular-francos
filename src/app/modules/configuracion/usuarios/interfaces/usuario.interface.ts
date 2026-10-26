import { TipoDocumentoDto } from './usuario-dto.interface';

export interface RolResumen {
  id: number;
  nombre: string;
}

/** Usuario interno tal como lo usa la pantalla. */
export interface Usuario {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  tipoDocumento: TipoDocumentoDto;
  numeroDocumento: string;
  email: string;
  username: string;
  activo: boolean;
  roles: RolResumen[];
  creado: string;
}

export interface Rol {
  id: number;
  nombre: string;
  etiqueta: string;
  descripcion: string;
}

export interface PaginaUsuarios {
  usuarios: Usuario[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface FiltrosUsuarios {
  busqueda: string;
  /** Nombre del rol ('' = todos). */
  rol: string;
  /** 'activo' | 'inactivo' ('' = todos). */
  estado: string;
  pagina: number;
}

export const USUARIOS_POR_PAGINA = 8;

/** El rol cliente es del otro portal: no se asigna a usuarios internos. */
export const ROL_CLIENTE = 'cliente';
export const ROL_ADMIN = 'admin';

const ETIQUETAS_ROL: Record<string, string> = {
  admin: 'Admin',
  ventas: 'Ventas',
  inventario: 'Inventario',
  produccion: 'Producción',
  estrategico: 'Estratégico',
  despacho: 'Despacho',
};

export function etiquetaDeRol(nombre: string): string {
  return ETIQUETAS_ROL[nombre] ?? nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

export const TIPOS_DOCUMENTO: { value: TipoDocumentoDto; label: string }[] = [
  { value: 'dni', label: 'DNI' },
  { value: 'ce', label: 'Carné de extranjería' },
  { value: 'pasaporte', label: 'Pasaporte' },
];

/** Campos del formulario de crear/editar usuario. */
export interface UsuarioForm {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  tipoDocumento: TipoDocumentoDto;
  numeroDocumento: string;
  email: string;
  username: string;
  contrasena: string;
  /** id del rol, como texto porque así lo maneja el select. */
  rolId: string;
  activo: boolean;
}

export type UsuarioErrores = Partial<Record<keyof UsuarioForm, string>>;

export const USUARIO_FORM_VACIO: UsuarioForm = {
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  tipoDocumento: 'dni',
  numeroDocumento: '',
  email: '',
  username: '',
  contrasena: '',
  rolId: '',
  activo: true,
};

// Mismas reglas que el backend (create-usuario-interno.dto.ts).
const USERNAME_PATRON = /^[a-zA-Z0-9._-]{3,50}$/;
const EMAIL_PATRON = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_DOCUMENTO: Record<TipoDocumentoDto, RegExp> = {
  dni: /^\d{8}$/,
  ruc: /^\d{11}$/,
  ce: /^[a-zA-Z0-9]{9,12}$/,
  pasaporte: /^[a-zA-Z0-9]{6,12}$/,
};
const MENSAJE_DOCUMENTO: Record<TipoDocumentoDto, string> = {
  dni: 'El DNI tiene 8 dígitos',
  ruc: 'El RUC tiene 11 dígitos',
  ce: 'El carné de extranjería tiene de 9 a 12 caracteres',
  pasaporte: 'El pasaporte tiene de 6 a 12 caracteres',
};

export function usuarioFormDe(usuario: Usuario): UsuarioForm {
  return {
    nombres: usuario.nombres,
    apellidoPaterno: usuario.apellidoPaterno,
    apellidoMaterno: usuario.apellidoMaterno,
    tipoDocumento: usuario.tipoDocumento,
    numeroDocumento: usuario.numeroDocumento,
    email: usuario.email,
    username: usuario.username,
    contrasena: '',
    rolId: usuario.roles[0] ? String(usuario.roles[0].id) : '',
    activo: usuario.activo,
  };
}

/**
 * El backend responde 409 con un texto por cada dato repetido; se lo muestra
 * junto al campo que corresponde (los mensajes salen de create/update-usuario-interno).
 */
export function conflictoDeCampo(
  mensaje: string,
): { campo: keyof UsuarioForm; texto: string } | null {
  const texto = mensaje.toLowerCase();
  if (texto.includes('email')) return { campo: 'email', texto: 'Email ya registrado' };
  if (texto.includes('nombre de usuario') || texto.includes('username')) {
    return { campo: 'username', texto: 'Username en uso' };
  }
  if (texto.includes('documento')) {
    return { campo: 'numeroDocumento', texto: 'Documento ya registrado' };
  }
  return null;
}

/** En edición el email y el documento no se tocan, así que no se validan. */
export function validarUsuario(form: UsuarioForm, modo: 'nuevo' | 'editar'): UsuarioErrores {
  const errores: UsuarioErrores = {};

  if (!form.nombres.trim()) errores.nombres = 'Ingresar los nombres';
  else if (form.nombres.trim().length > 100) errores.nombres = 'Máximo 100 caracteres';

  if (!form.apellidoPaterno.trim()) errores.apellidoPaterno = 'Ingresar el apellido paterno';
  else if (form.apellidoPaterno.trim().length > 100) {
    errores.apellidoPaterno = 'Máximo 100 caracteres';
  }

  if (!form.apellidoMaterno.trim()) errores.apellidoMaterno = 'Ingresar el apellido materno';
  else if (form.apellidoMaterno.trim().length > 100) {
    errores.apellidoMaterno = 'Máximo 100 caracteres';
  }

  if (modo === 'nuevo') {
    const documento = form.numeroDocumento.trim();
    if (!documento) errores.numeroDocumento = 'Ingresar el número de documento';
    else if (!FORMATO_DOCUMENTO[form.tipoDocumento].test(documento)) {
      errores.numeroDocumento = MENSAJE_DOCUMENTO[form.tipoDocumento];
    }

    const email = form.email.trim();
    if (!EMAIL_PATRON.test(email) || email.length > 150) errores.email = 'Email inválido';
  }

  if (!USERNAME_PATRON.test(form.username.trim())) errores.username = 'Username inválido';

  if (modo === 'nuevo' && !form.contrasena) errores.contrasena = 'Ingresar una contraseña';
  else if (form.contrasena && form.contrasena.length < 8) {
    errores.contrasena = 'Mínimo 8 caracteres';
  }

  if (!form.rolId) errores.rolId = 'Seleccionar un rol';

  return errores;
}
