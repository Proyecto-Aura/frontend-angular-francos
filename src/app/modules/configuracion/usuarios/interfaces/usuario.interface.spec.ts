import {
  USUARIO_FORM_VACIO,
  UsuarioForm,
  conflictoDeCampo,
  etiquetaDeRol,
  usuarioFormDe,
  validarUsuario,
} from './usuario.interface';
import { toUsuario } from '../mappers/usuario.mapper';
import { makeUsuarioDto } from '../testing/usuario-fixtures';

function formValido(overrides: Partial<UsuarioForm> = {}): UsuarioForm {
  return {
    ...USUARIO_FORM_VACIO,
    nombres: 'Lucia',
    apellidoPaterno: 'Quispe',
    apellidoMaterno: 'Huaman',
    numeroDocumento: '45678912',
    email: 'lucia@francos.test',
    username: 'lquispe',
    contrasena: 'Clave1234',
    rolId: '2',
    ...overrides,
  };
}

describe('validarUsuario', () => {
  it('no marca errores en un formulario completo', () => {
    expect(validarUsuario(formValido(), 'nuevo')).toEqual({});
  });

  it('pide todos los campos obligatorios al crear', () => {
    const errores = validarUsuario({ ...USUARIO_FORM_VACIO }, 'nuevo');

    expect(errores).toEqual({
      nombres: 'Ingresar los nombres',
      apellidoPaterno: 'Ingresar el apellido paterno',
      apellidoMaterno: 'Ingresar el apellido materno',
      numeroDocumento: 'Ingresar el número de documento',
      email: 'Email inválido',
      username: 'Username inválido',
      contrasena: 'Ingresar una contraseña',
      rolId: 'Seleccionar un rol',
    });
  });

  it('valida el formato del documento según su tipo', () => {
    expect(validarUsuario(formValido({ numeroDocumento: '1234' }), 'nuevo').numeroDocumento).toBe(
      'El DNI tiene 8 dígitos',
    );
    expect(
      validarUsuario(formValido({ tipoDocumento: 'ce', numeroDocumento: '123' }), 'nuevo')
        .numeroDocumento,
    ).toBe('El carné de extranjería tiene de 9 a 12 caracteres');
    expect(
      validarUsuario(
        formValido({ tipoDocumento: 'pasaporte', numeroDocumento: 'AB123456' }),
        'nuevo',
      ).numeroDocumento,
    ).toBeUndefined();
  });

  it('rechaza un email mal formado', () => {
    expect(validarUsuario(formValido({ email: 'lucia@' }), 'nuevo').email).toBe('Email inválido');
  });

  it('rechaza un username con caracteres no permitidos o muy corto', () => {
    expect(validarUsuario(formValido({ username: 'lu' }), 'nuevo').username).toBe(
      'Username inválido',
    );
    expect(validarUsuario(formValido({ username: 'lu quispe' }), 'nuevo').username).toBe(
      'Username inválido',
    );
    expect(
      validarUsuario(formValido({ username: 'lu.quispe_1-a' }), 'nuevo').username,
    ).toBeUndefined();
  });

  it('exige mínimo 8 caracteres en la contraseña', () => {
    expect(validarUsuario(formValido({ contrasena: 'corta' }), 'nuevo').contrasena).toBe(
      'Mínimo 8 caracteres',
    );
  });

  it('al editar, la contraseña es opcional pero si se escribe debe tener 8 caracteres', () => {
    expect(validarUsuario(formValido({ contrasena: '' }), 'editar').contrasena).toBeUndefined();
    expect(validarUsuario(formValido({ contrasena: 'corta' }), 'editar').contrasena).toBe(
      'Mínimo 8 caracteres',
    );
  });

  it('al editar no valida el email ni el documento (no se pueden cambiar)', () => {
    const errores = validarUsuario(formValido({ email: '', numeroDocumento: '' }), 'editar');

    expect(errores.email).toBeUndefined();
    expect(errores.numeroDocumento).toBeUndefined();
  });
});

describe('conflictoDeCampo', () => {
  it('ubica el dato repetido en su campo con el texto del diseño', () => {
    expect(conflictoDeCampo('Existe un usuario con ese mismo email')).toEqual({
      campo: 'email',
      texto: 'Email ya registrado',
    });
    expect(conflictoDeCampo('Ya existe un usuario con ese nombre de usuario')).toEqual({
      campo: 'username',
      texto: 'Username en uso',
    });
    expect(conflictoDeCampo('Existe una persona con ese mismo número de documento')).toEqual({
      campo: 'numeroDocumento',
      texto: 'Documento ya registrado',
    });
  });

  it('devuelve null si el conflicto no corresponde a un campo', () => {
    expect(conflictoDeCampo('No puede desactivar al último administrador')).toBeNull();
  });
});

describe('etiquetaDeRol', () => {
  it('pone tildes a los roles conocidos y capitaliza el resto', () => {
    expect(etiquetaDeRol('produccion')).toBe('Producción');
    expect(etiquetaDeRol('estrategico')).toBe('Estratégico');
    expect(etiquetaDeRol('nuevo-rol')).toBe('Nuevo-rol');
  });
});

describe('usuarioFormDe', () => {
  it('arma el formulario de edición con la contraseña vacía y el primer rol', () => {
    const form = usuarioFormDe(toUsuario(makeUsuarioDto()));

    expect(form).toMatchObject({
      nombres: 'Lucia',
      apellidoPaterno: 'Quispe',
      apellidoMaterno: 'Huaman',
      email: 'lucia@francos.test',
      username: 'lquispe',
      contrasena: '',
      rolId: '2',
    });
  });
});
