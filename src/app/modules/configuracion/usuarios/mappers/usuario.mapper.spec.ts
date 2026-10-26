import { USUARIO_FORM_VACIO, UsuarioForm } from '../interfaces/usuario.interface';
import { makePaginaDto, makeRolDto, makeUsuarioDto } from '../testing/usuario-fixtures';
import {
  toActualizarUsuarioRequest,
  toCrearUsuarioRequest,
  toPaginaUsuarios,
  toRol,
  toUsuario,
} from './usuario.mapper';

const form: UsuarioForm = {
  ...USUARIO_FORM_VACIO,
  nombres: ' Lucia ',
  apellidoPaterno: 'Quispe',
  apellidoMaterno: 'Huaman',
  tipoDocumento: 'dni',
  numeroDocumento: ' 45678912 ',
  email: ' Lucia@Francos.TEST ',
  username: ' lquispe ',
  contrasena: 'Clave1234',
  rolId: '2',
  activo: false,
};

describe('usuario.mapper', () => {
  it('toUsuario arma el nombre completo, el estado y los roles', () => {
    const usuario = toUsuario(makeUsuarioDto({ estado: false }));

    expect(usuario).toMatchObject({
      id: 'u-1',
      nombreCompleto: 'Lucia Quispe Huaman',
      activo: false,
      roles: [{ id: 2, nombre: 'ventas' }],
    });
    expect(usuario.creado).toContain('2026');
  });

  it('toPaginaUsuarios usa total y total_pages del backend (mínimo 1 página)', () => {
    const pagina = toPaginaUsuarios(
      makePaginaDto([makeUsuarioDto()], { total: 20, page: 2, total_pages: 3 }),
    );
    expect(pagina).toMatchObject({ total: 20, pagina: 2, totalPaginas: 3 });
    expect(pagina.usuarios).toHaveLength(1);

    expect(toPaginaUsuarios(makePaginaDto([], { total: 0, total_pages: 0 })).totalPaginas).toBe(1);
  });

  it('toRol deja la descripción vacía si el backend manda null', () => {
    expect(toRol(makeRolDto({ nombre: 'produccion' }))).toMatchObject({
      etiqueta: 'Producción',
      descripcion: '',
    });
    expect(toRol(makeRolDto({ descripcion: 'Gestión de ventas' })).descripcion).toBe(
      'Gestión de ventas',
    );
  });

  it('toCrearUsuarioRequest recorta, pasa el email a minúsculas y manda el rol como lista', () => {
    expect(toCrearUsuarioRequest(form)).toEqual({
      nombres: 'Lucia',
      apellido_paterno: 'Quispe',
      apellido_materno: 'Huaman',
      tipo_documento: 'dni',
      numero_documento: '45678912',
      email: 'lucia@francos.test',
      username: 'lquispe',
      contrasena: 'Clave1234',
      estado: false,
      rol_ids: [2],
    });
  });

  it('toActualizarUsuarioRequest manda solo lo que cambió', () => {
    const original = toUsuario(makeUsuarioDto());

    expect(
      toActualizarUsuarioRequest(original, {
        ...form,
        nombres: 'Lucia',
        username: 'lquispe',
        contrasena: '',
      }),
    ).toEqual({});

    expect(
      toActualizarUsuarioRequest(original, {
        ...form,
        nombres: 'Lucía María',
        username: 'lquispe',
        contrasena: 'Nueva1234',
      }),
    ).toEqual({ nombres: 'Lucía María', contrasena: 'Nueva1234' });
  });
});
