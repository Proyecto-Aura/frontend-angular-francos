import {
  ActualizarUsuarioRequestDto,
  CrearUsuarioRequestDto,
  PaginaUsuariosDto,
  RolDto,
  UsuarioInternoDto,
} from '../interfaces/usuario-dto.interface';
import {
  PaginaUsuarios,
  Rol,
  Usuario,
  UsuarioForm,
  etiquetaDeRol,
} from '../interfaces/usuario.interface';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function toUsuario(dto: UsuarioInternoDto): Usuario {
  return {
    id: dto.id,
    nombres: dto.nombres,
    apellidoPaterno: dto.apellido_paterno,
    apellidoMaterno: dto.apellido_materno,
    nombreCompleto: `${dto.nombres} ${dto.apellido_paterno} ${dto.apellido_materno}`.trim(),
    tipoDocumento: dto.tipo_documento,
    numeroDocumento: dto.numero_documento,
    email: dto.email,
    username: dto.username,
    activo: dto.estado,
    roles: dto.roles.map((rol) => ({ id: rol.id, nombre: rol.nombre })),
    creado: FORMATO_FECHA.format(new Date(dto.created_at)),
  };
}

export function toPaginaUsuarios(dto: PaginaUsuariosDto): PaginaUsuarios {
  return {
    usuarios: dto.data.map(toUsuario),
    total: dto.meta.total,
    pagina: dto.meta.page,
    totalPaginas: Math.max(1, dto.meta.total_pages),
  };
}

export function toRol(dto: RolDto): Rol {
  return {
    id: dto.id,
    nombre: dto.nombre,
    etiqueta: etiquetaDeRol(dto.nombre),
    descripcion: dto.descripcion ?? '',
  };
}

export function toCrearUsuarioRequest(form: UsuarioForm): CrearUsuarioRequestDto {
  return {
    nombres: form.nombres.trim(),
    apellido_paterno: form.apellidoPaterno.trim(),
    apellido_materno: form.apellidoMaterno.trim(),
    tipo_documento: form.tipoDocumento,
    numero_documento: form.numeroDocumento.trim(),
    email: form.email.trim().toLowerCase(),
    username: form.username.trim(),
    contrasena: form.contrasena,
    estado: form.activo,
    rol_ids: [Number(form.rolId)],
  };
}

/** Solo lo que cambió: el PATCH del backend actualiza únicamente lo que llega. */
export function toActualizarUsuarioRequest(
  original: Usuario,
  form: UsuarioForm,
): ActualizarUsuarioRequestDto {
  const cambios: ActualizarUsuarioRequestDto = {};
  const nombres = form.nombres.trim();
  const apellidoPaterno = form.apellidoPaterno.trim();
  const apellidoMaterno = form.apellidoMaterno.trim();
  const username = form.username.trim();

  if (nombres !== original.nombres) cambios.nombres = nombres;
  if (apellidoPaterno !== original.apellidoPaterno) cambios.apellido_paterno = apellidoPaterno;
  if (apellidoMaterno !== original.apellidoMaterno) cambios.apellido_materno = apellidoMaterno;
  if (username !== original.username) cambios.username = username;
  if (form.contrasena) cambios.contrasena = form.contrasena;
  return cambios;
}
