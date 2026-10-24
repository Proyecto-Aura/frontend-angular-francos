import {
  Cliente,
  ClienteForm,
  clienteAForm,
  clienteFormVacio,
  limpiarCamposDeOtroTipo,
  nombreCliente,
  tipoClientePorDocumento,
  validarClienteForm,
} from './cliente.interface';

function makeCliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: 'c1',
    codigo: 'CLI-000001',
    personaId: 'p1',
    tipoCliente: 'persona_natural',
    razonSocial: '',
    categoria: 'minorista',
    estado: true,
    nombres: 'Ana María',
    apellidoPaterno: 'Vega',
    apellidoMaterno: 'Torres',
    tipoDocumento: 'dni',
    numeroDocumento: '45288977',
    telefono: '944208877',
    fechaNacimiento: '1989-04-17',
    direccion: 'Jr. Las Magnolias 312',
    ubicacion: {
      departamento: { id: '15', nombre: 'Lima' },
      provincia: { id: '1501', nombre: 'Lima' },
      distrito: { id: '150131', nombre: 'San Isidro' },
    },
    email: 'ana@correo.com',
    ...overrides,
  };
}

function makeFormNatural(overrides: Partial<ClienteForm> = {}): ClienteForm {
  return {
    ...clienteFormVacio(),
    tipoDocumento: 'dni',
    numeroDocumento: '45288977',
    nombres: 'Ana',
    apellidoPaterno: 'Vega',
    apellidoMaterno: 'Torres',
    fechaNacimiento: '1989-04-17',
    direccion: 'Jr. Las Magnolias 312',
    departamentoId: '15',
    provinciaId: '1501',
    distritoId: '150131',
    telefono: '944208877',
    email: 'ana@correo.com',
    ...overrides,
  };
}

function makeFormEmpresa(overrides: Partial<ClienteForm> = {}): ClienteForm {
  return {
    ...clienteFormVacio(),
    tipoDocumento: 'ruc',
    numeroDocumento: '20548712345',
    razonSocial: 'Distribuidora Andes S.A.C.',
    nombres: 'Rosa',
    apellidoPaterno: 'Quispe',
    apellidoMaterno: 'Huamán',
    categoria: 'mayorista',
    telefono: '987654321',
    email: 'compras@andes.com.pe',
    ...overrides,
  };
}

describe('cliente.interface', () => {
  describe('nombreCliente', () => {
    it('shows the business name for a company', () => {
      const empresa = makeCliente({
        tipoCliente: 'empresa',
        razonSocial: 'Hotel Costa Verde S.A.',
      });

      expect(nombreCliente(empresa)).toBe('Hotel Costa Verde S.A.');
    });

    it('joins names and surnames for a natural person', () => {
      expect(nombreCliente(makeCliente())).toBe('Ana María Vega Torres');
    });

    it('skips missing parts without leaving extra spaces', () => {
      expect(nombreCliente(makeCliente({ apellidoMaterno: '' }))).toBe('Ana María Vega');
    });
  });

  describe('tipoClientePorDocumento', () => {
    it('treats an RUC starting with 20 as a company', () => {
      expect(tipoClientePorDocumento('ruc', '20548712345')).toBe('empresa');
    });

    it('treats an RUC starting with 10 as a natural person', () => {
      expect(tipoClientePorDocumento('ruc', '10512477903')).toBe('persona_natural');
    });

    it('treats any other document as a natural person', () => {
      expect(tipoClientePorDocumento('dni', '20548712')).toBe('persona_natural');
      expect(tipoClientePorDocumento('ce', '201948220')).toBe('persona_natural');
    });
  });

  describe('limpiarCamposDeOtroTipo', () => {
    it('clears the natural person fields when it becomes a company', () => {
      const form = makeFormNatural({ razonSocial: '' });

      const limpio = limpiarCamposDeOtroTipo(form, 'empresa');

      expect(limpio.fechaNacimiento).toBe('');
      expect(limpio.direccion).toBe('');
      expect(limpio.departamentoId).toBe('');
      expect(limpio.provinciaId).toBe('');
      expect(limpio.distritoId).toBe('');
      expect(limpio.nombres).toBe('Ana');
    });

    it('clears the business name when it becomes a natural person', () => {
      const limpio = limpiarCamposDeOtroTipo(makeFormEmpresa(), 'persona_natural');

      expect(limpio.razonSocial).toBe('');
      expect(limpio.nombres).toBe('Rosa');
    });
  });

  describe('clienteAForm', () => {
    it('copies the editable fields of a client', () => {
      const form = clienteAForm(makeCliente());

      expect(form).toMatchObject({
        tipoDocumento: 'dni',
        numeroDocumento: '45288977',
        nombres: 'Ana María',
        categoria: 'minorista',
        departamentoId: '15',
        provinciaId: '1501',
        distritoId: '150131',
        email: 'ana@correo.com',
      });
    });

    it('leaves the location empty when the client has none', () => {
      const form = clienteAForm(makeCliente({ ubicacion: null }));

      expect(form).toMatchObject({ departamentoId: '', provinciaId: '', distritoId: '' });
    });
  });

  describe('validarClienteForm', () => {
    it('accepts a complete natural person', () => {
      expect(validarClienteForm(makeFormNatural(), false)).toEqual([]);
    });

    it('accepts a complete company', () => {
      expect(validarClienteForm(makeFormEmpresa(), false)).toEqual([]);
    });

    it('lists every missing field of an empty form', () => {
      expect(validarClienteForm(clienteFormVacio(), false)).toEqual([
        'número de documento',
        'nombres',
        'apellido paterno',
        'apellido materno',
        'fecha de nacimiento',
        'departamento',
        'provincia',
        'distrito',
        'dirección',
        'teléfono',
        'correo',
      ]);
    });

    it('asks for the contact data and the business name in a company', () => {
      const errores = validarClienteForm(
        makeFormEmpresa({ razonSocial: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '' }),
        false,
      );

      expect(errores).toEqual([
        'razón social',
        'nombres del contacto',
        'apellido paterno del contacto',
        'apellido materno del contacto',
      ]);
    });

    it('asks for the full location of a natural person', () => {
      const errores = validarClienteForm(
        makeFormNatural({ departamentoId: '15', provinciaId: '', distritoId: '' }),
        false,
      );

      expect(errores).toEqual(['provincia', 'distrito']);
    });

    it('does not ask for birth date, location or address in a company', () => {
      const errores = validarClienteForm(
        makeFormEmpresa({ fechaNacimiento: '', direccion: '' }),
        false,
      );

      expect(errores).toEqual([]);
    });

    it('checks the document format of each type', () => {
      expect(validarClienteForm(makeFormNatural({ numeroDocumento: '1234' }), false)).toContain(
        'el DNI debe tener 8 dígitos',
      );
      expect(validarClienteForm(makeFormEmpresa({ numeroDocumento: '2054871' }), false)).toContain(
        'el RUC debe tener 11 dígitos',
      );
      expect(
        validarClienteForm(makeFormNatural({ tipoDocumento: 'ce', numeroDocumento: '123' }), false),
      ).toContain('el carné de extranjería debe tener de 9 a 12 letras o números');
      expect(
        validarClienteForm(
          makeFormNatural({ tipoDocumento: 'pasaporte', numeroDocumento: 'AB1' }),
          false,
        ),
      ).toContain('el pasaporte debe tener de 6 a 12 letras o números');
    });

    it('accepts alphanumeric foreign documents', () => {
      const ce = makeFormNatural({ tipoDocumento: 'ce', numeroDocumento: 'A00194822' });
      const pasaporte = makeFormNatural({
        tipoDocumento: 'pasaporte',
        numeroDocumento: 'PE4471208',
      });

      expect(validarClienteForm(ce, false)).toEqual([]);
      expect(validarClienteForm(pasaporte, false)).toEqual([]);
    });

    it('requires an RUC that starts with 10 or 20', () => {
      const errores = validarClienteForm(
        makeFormNatural({ tipoDocumento: 'ruc', numeroDocumento: '30548712345' }),
        false,
      );

      expect(errores).toContain('el RUC debe iniciar en 10 o 20');
    });

    it('requires a 9-digit phone', () => {
      expect(validarClienteForm(makeFormNatural({ telefono: '12345' }), false)).toContain(
        'el teléfono debe tener 9 dígitos',
      );
    });

    it('requires a valid email when registering', () => {
      expect(validarClienteForm(makeFormNatural({ email: 'sin-arroba' }), false)).toContain(
        'el correo no tiene un formato válido',
      );
    });

    it('does not validate the email when editing', () => {
      expect(validarClienteForm(makeFormNatural({ email: '' }), true)).toEqual([]);
    });

    it('limits the business name to 200 characters', () => {
      const errores = validarClienteForm(makeFormEmpresa({ razonSocial: 'x'.repeat(201) }), false);

      expect(errores).toEqual(['la razón social no puede pasar de 200 caracteres']);
    });
  });
});
