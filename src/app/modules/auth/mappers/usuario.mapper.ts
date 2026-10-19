import { UsuarioDto } from '../interfaces/usuario-dto.interface';
import { Usuario } from '../interfaces/usuario.interface';

export function mapUsuarioDtoToUsuario(dto: UsuarioDto): Usuario {
  return {
    id: dto.id,
    email: dto.email,
    username: dto.username,
    activo: dto.estado === 'activo',
  };
}
