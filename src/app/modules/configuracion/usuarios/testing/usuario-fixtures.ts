import { RutaNodo } from '../../../../core/interfaces/ruta-nodo.interface';
import { PaginaUsuariosDto, RolDto, UsuarioInternoDto } from '../interfaces/usuario-dto.interface';

export function makeUsuarioDto(overrides: Partial<UsuarioInternoDto> = {}): UsuarioInternoDto {
  return {
    id: 'u-1',
    persona_id: 'p-1',
    nombres: 'Lucia',
    apellido_paterno: 'Quispe',
    apellido_materno: 'Huaman',
    tipo_documento: 'dni',
    numero_documento: '45678912',
    email: 'lucia@francos.test',
    username: 'lquispe',
    estado: true,
    email_verificado: true,
    debe_cambiar_contrasena: false,
    roles: [{ id: 2, nombre: 'ventas' }],
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

export function makePaginaDto(
  usuarios: UsuarioInternoDto[],
  meta: Partial<PaginaUsuariosDto['meta']> = {},
): PaginaUsuariosDto {
  return {
    data: usuarios,
    meta: { total: usuarios.length, page: 1, limit: 8, total_pages: 1, ...meta },
  };
}

export function makeRolDto(overrides: Partial<RolDto> = {}): RolDto {
  return { id: 2, nombre: 'ventas', descripcion: null, estado: true, ...overrides };
}

export function makeNodo(overrides: Partial<RutaNodo> = {}): RutaNodo {
  return {
    id: 1,
    nombre: 'x',
    etiqueta: 'X',
    icono: 'package',
    descripcion: null,
    estado: true,
    parent_id: null,
    children: [],
    ...overrides,
  };
}
