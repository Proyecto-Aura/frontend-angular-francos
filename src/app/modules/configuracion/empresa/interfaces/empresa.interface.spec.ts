import { EmpresaForm, validarEmpresa, validarLogo } from './empresa.interface';

const valido: EmpresaForm = {
  razonSocial: 'Franco SAC',
  ruc: '20548712345',
  direccion: 'Av. Principal 100',
  telefono: '',
  email: '',
};

describe('validarEmpresa', () => {
  it('no marca errores con los obligatorios válidos', () => {
    expect(validarEmpresa(valido)).toEqual({});
  });

  it('pide razón social, RUC y dirección', () => {
    const errores = validarEmpresa({ ...valido, razonSocial: ' ', ruc: '', direccion: '' });

    expect(errores).toEqual({
      razonSocial: 'Ingresar la razón social',
      ruc: 'Ingresar el RUC',
      direccion: 'Ingresar la dirección fiscal',
    });
  });

  it.each(['12345678901', '2054871234', '205487123456', '2054871234a', '30548712345'])(
    'rechaza el RUC %s',
    (ruc) => {
      expect(validarEmpresa({ ...valido, ruc }).ruc).toBe(
        'RUC inválido: 11 dígitos, inicia con 10 o 20',
      );
    },
  );

  it.each(['10548712345', '20548712345'])('acepta el RUC %s', (ruc) => {
    expect(validarEmpresa({ ...valido, ruc }).ruc).toBeUndefined();
  });

  it('acepta el teléfono con espacios si son 9 dígitos y lo exige de 9', () => {
    expect(validarEmpresa({ ...valido, telefono: '01 234 5678' }).telefono).toBeUndefined();
    expect(validarEmpresa({ ...valido, telefono: '987654321' }).telefono).toBeUndefined();
    expect(validarEmpresa({ ...valido, telefono: '1234567' }).telefono).toBe(
      'Teléfono inválido: 9 dígitos',
    );
    expect(validarEmpresa({ ...valido, telefono: '98765432a' }).telefono).toBe(
      'Teléfono inválido: 9 dígitos',
    );
  });

  it('valida el formato del email solo si se escribió', () => {
    expect(validarEmpresa({ ...valido, email: 'facturacion@empresa.pe' }).email).toBeUndefined();
    expect(validarEmpresa({ ...valido, email: 'sin-arroba' }).email).toBe('Email inválido');
  });
});

describe('validarLogo', () => {
  it('acepta PNG y JPG de hasta 1 MB', () => {
    expect(validarLogo({ type: 'image/png', size: 1024 * 1024 })).toBeNull();
    expect(validarLogo({ type: 'image/jpeg', size: 10 })).toBeNull();
  });

  it('rechaza otros formatos', () => {
    expect(validarLogo({ type: 'image/webp', size: 10 })).toBe(
      'Formato no admitido. Usar PNG o JPG',
    );
    expect(validarLogo({ type: 'application/pdf', size: 10 })).toBe(
      'Formato no admitido. Usar PNG o JPG',
    );
  });

  it('rechaza más de 1 MB', () => {
    expect(validarLogo({ type: 'image/png', size: 1024 * 1024 + 1 })).toBe(
      'El archivo supera 1 MB',
    );
  });
});
