import { mapUsuarioDtoToUsuario } from './usuario.mapper';
import { UsuarioDto } from '../interfaces/usuario-dto.interface';

function makeDto(overrides: Partial<UsuarioDto> = {}): UsuarioDto {
  return {
    id: 1,
    email: 'admin@francos.com',
    username: 'admin',
    estado: 'activo',
    persona_id: 10,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('mapUsuarioDtoToUsuario', () => {
  it('copies id, email and username as-is', () => {
    const usuario = mapUsuarioDtoToUsuario(makeDto({ id: 7, email: 'x@y.com', username: 'xy' }));
    expect(usuario.id).toBe(7);
    expect(usuario.email).toBe('x@y.com');
    expect(usuario.username).toBe('xy');
  });

  it('maps estado "activo" to activo: true', () => {
    const usuario = mapUsuarioDtoToUsuario(makeDto({ estado: 'activo' }));
    expect(usuario.activo).toBe(true);
  });

  it('maps estado "inactivo" to activo: false', () => {
    const usuario = mapUsuarioDtoToUsuario(makeDto({ estado: 'inactivo' }));
    expect(usuario.activo).toBe(false);
  });

  it('does not leak raw dto fields (persona_id, created_at) onto the domain model', () => {
    const usuario = mapUsuarioDtoToUsuario(makeDto());
    expect((usuario as unknown as Record<string, unknown>)['persona_id']).toBeUndefined();
    expect((usuario as unknown as Record<string, unknown>)['created_at']).toBeUndefined();
  });
});
