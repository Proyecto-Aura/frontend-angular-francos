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

/**
 * Lo que se muestra en el listado: la fecha de ingreso del empleado; los
 * usuarios creados antes de este campo (sin empleado) caen a created_at.
 * Nunca truena: un valor vacío o inválido en cualquiera de los dos (ej. "" en
 * vez de null) se descarta en vez de romper el formateo de toda la página.
 */
function fechaMostrada(dto: UsuarioInternoDto): string {
  const candidatas = [
    dto.fecha_ingreso ? new Date(`${dto.fecha_ingreso}T00:00:00`) : null,
    new Date(dto.created_at),
  ];
  const fecha = candidatas.find((f): f is Date => f !== null && !Number.isNaN(f.getTime()));
  return fecha ? FORMATO_FECHA.format(fecha) : '—';
}

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
    fotoUrl: dto.foto_url,
    cargo: dto.cargo,
    area: dto.area,
    fechaIngreso: dto.fecha_ingreso,
    creado: fechaMostrada(dto),
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
  const area = form.area.trim();
  const fechaIngreso = form.fechaIngreso.trim();

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
    rol_ids: form.rolIds.map(Number),
    cargo: form.cargo.trim(),
    ...(area && { area }),
    ...(fechaIngreso && { fecha_ingreso: fechaIngreso }),
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
