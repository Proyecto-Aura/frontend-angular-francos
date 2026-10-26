import { ClienteDto } from '../interfaces/cliente-dto.interface';
import { ClienteForm, clienteFormVacio } from '../interfaces/cliente.interface';
import {
  toActualizarClienteRequest,
  toCliente,
  toClienteRegistrado,
  toClientesPagina,
  toRegistrarClienteRequest,
} from './cliente.mapper';

function makeClienteDto(overrides: Partial<ClienteDto> = {}): ClienteDto {
  return {
    id: 'c1',
    codigo: 'CLI-000001',
    persona_id: 'p1',
    tipo_cliente: 'persona_natural',
    razon_social: null,
    categoria_cliente: 'minorista',
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    nombres: 'Ana',
    apellido_paterno: 'Vega',
    apellido_materno: 'Torres',
    tipo_documento: 'dni',
    numero_documento: '45288977',
    telefono: '944208877',
    fecha_nacimiento: '1989-04-17T00:00:00.000Z',
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

function makeForm(overrides: Partial<ClienteForm> = {}): ClienteForm {
  return {
    ...clienteFormVacio(),
    tipoDocumento: 'dni',
    numeroDocumento: ' 45288977 ',
    nombres: ' Ana ',
    apellidoPaterno: 'Vega',
    apellidoMaterno: 'Torres',
    fechaNacimiento: '1989-04-17',
    direccion: ' Jr. Las Magnolias 312 ',
    departamentoId: '15',
    provinciaId: '1501',
    distritoId: '150131',
    telefono: '944208877',
    email: ' ana@correo.com ',
    ...overrides,
  };
}

describe('cliente.mapper', () => {
  describe('toCliente', () => {
    it('maps the response to the client model', () => {
      expect(toCliente(makeClienteDto())).toEqual({
        id: 'c1',
        codigo: 'CLI-000001',
        personaId: 'p1',
        tipoCliente: 'persona_natural',
        razonSocial: '',
        categoria: 'minorista',
        estado: true,
        nombres: 'Ana',
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
      });
    });

    it('turns null optional fields into empty text', () => {
      const cliente = toCliente(
        makeClienteDto({
          telefono: null,
          fecha_nacimiento: null,
          direccion: null,
          ubicacion: null,
          email: null,
        }),
      );

      expect(cliente).toMatchObject({
        telefono: '',
        fechaNacimiento: '',
        direccion: '',
        ubicacion: null,
        email: '',
      });
    });

    it('maps the access account only when it comes', () => {
      expect(toCliente(makeClienteDto())).not.toHaveProperty('usuario');

      const cliente = toCliente(
        makeClienteDto({
          username: 'andes.20548712345',
          email_verificado: false,
        }),
      );

      expect(cliente).toMatchObject({
        usuario: 'andes.20548712345',
        correoVerificado: false,
      });
    });

    it('keeps the business name of a company', () => {
      const cliente = toCliente(
        makeClienteDto({ tipo_cliente: 'empresa', razon_social: 'Hotel Costa Verde S.A.' }),
      );

      expect(cliente.razonSocial).toBe('Hotel Costa Verde S.A.');
    });
  });

  describe('toClientesPagina', () => {
    it('maps the rows and the pagination metadata', () => {
      const pagina = toClientesPagina({
        data: [makeClienteDto(), makeClienteDto({ id: 'c2' })],
        meta: { total: 11, page: 2, limit: 8, total_pages: 2 },
      });

      expect(pagina.clientes.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(pagina).toMatchObject({ total: 11, pagina: 2, totalPaginas: 2 });
    });
  });

  describe('toClienteRegistrado', () => {
    it('keeps the generated user and the email', () => {
      const registrado = toClienteRegistrado({
        id: 'u1',
        email: 'ana@correo.com',
        username: '45288977',
        email_verificado: false,
        debe_cambiar_contrasena: true,
      });

      expect(registrado).toEqual({ usuario: '45288977', email: 'ana@correo.com' });
    });
  });

  describe('toRegistrarClienteRequest', () => {
    it('builds the registration body trimming the text', () => {
      expect(toRegistrarClienteRequest(makeForm())).toEqual({
        nombres: 'Ana',
        apellido_paterno: 'Vega',
        apellido_materno: 'Torres',
        tipo_documento: 'dni',
        numero_documento: '45288977',
        telefono: '944208877',
        fecha_nacimiento: '1989-04-17',
        direccion: 'Jr. Las Magnolias 312',
        distrito_id: '150131',
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'minorista',
        email: 'ana@correo.com',
      });
    });

    it('sends the business name only for a company', () => {
      const empresa = makeForm({
        tipoDocumento: 'ruc',
        numeroDocumento: '20548712345',
        razonSocial: ' Distribuidora Andes S.A.C. ',
        fechaNacimiento: '',
        direccion: '',
      });

      const body = toRegistrarClienteRequest(empresa);

      expect(body).toMatchObject({
        tipo_cliente: 'empresa',
        razon_social: 'Distribuidora Andes S.A.C.',
      });
      expect(body).not.toHaveProperty('fecha_nacimiento');
      expect(body).not.toHaveProperty('direccion');
    });

    it('sends the district code only when one was chosen', () => {
      const sinDistrito = toRegistrarClienteRequest(
        makeForm({ departamentoId: '', provinciaId: '', distritoId: '' }),
      );

      expect(sinDistrito).not.toHaveProperty('distrito_id');
      expect(toRegistrarClienteRequest(makeForm())).toMatchObject({ distrito_id: '150131' });
    });

    it('omits the business name for a natural person even if the form still has one', () => {
      const body = toRegistrarClienteRequest(makeForm({ razonSocial: 'Resto de otro cliente' }));

      expect(body).not.toHaveProperty('razon_social');
    });

    it('treats an RUC 10 as a natural person', () => {
      const body = toRegistrarClienteRequest(
        makeForm({ tipoDocumento: 'ruc', numeroDocumento: '10512477903' }),
      );

      expect(body.tipo_cliente).toBe('persona_natural');
    });

    it('omits the optional fields that are empty', () => {
      const body = toRegistrarClienteRequest(
        makeForm({ telefono: '', fechaNacimiento: '', direccion: '' }),
      );

      expect(body).not.toHaveProperty('telefono');
      expect(body).not.toHaveProperty('fecha_nacimiento');
      expect(body).not.toHaveProperty('direccion');
    });
  });

  describe('toActualizarClienteRequest', () => {
    it('sends the same data as the registration but without the email', () => {
      const body = toActualizarClienteRequest(makeForm({ categoria: 'mayorista' }));

      expect(body).toMatchObject({
        nombres: 'Ana',
        tipo_documento: 'dni',
        numero_documento: '45288977',
        tipo_cliente: 'persona_natural',
        categoria_cliente: 'mayorista',
      });
      expect(body).not.toHaveProperty('email');
    });
  });
});
