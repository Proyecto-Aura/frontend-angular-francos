import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ClienteDto } from '../interfaces/cliente-dto.interface';
import { ClienteForm, ClientesPagina, clienteFormVacio } from '../interfaces/cliente.interface';
import { ClienteService } from './cliente.service';

const CLIENTES_BASE = `${environment.apiUrl}/clientes`;
const REGISTRO_URL = `${environment.apiUrl}/auth/register/cliente`;

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

describe('ClienteService', () => {
  let service: ClienteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClienteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a requested page and maps the response', () => {
    let resultado!: ClientesPagina;
    service
      .listar(2, 8, {
        search: 'ana',
        estado: true,
        tipoCliente: 'persona_natural',
        categoria: 'minorista',
      })
      .subscribe((pagina) => (resultado = pagina));

    const req = httpMock.expectOne(
      (request) =>
        request.url === CLIENTES_BASE &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '8' &&
        request.params.get('search') === 'ana' &&
        request.params.get('estado') === 'true' &&
        request.params.get('tipo_cliente') === 'persona_natural' &&
        request.params.get('categoria_cliente') === 'minorista',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: [makeClienteDto()],
      meta: { total: 9, page: 2, limit: 8, total_pages: 2 },
    });

    expect(resultado).toMatchObject({ total: 9, pagina: 2, totalPaginas: 2 });
    expect(resultado.clientes[0]).toMatchObject({ id: 'c1', numeroDocumento: '45288977' });
  });

  it('sends estado=false as the literal boolean', () => {
    service.listar(1, 8, { estado: false }).subscribe();

    const req = httpMock.expectOne(
      (request) => request.url === CLIENTES_BASE && request.params.get('estado') === 'false',
    );
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 8, total_pages: 0 } });
  });

  it('omits empty filters from the query params', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne((request) => request.url === CLIENTES_BASE);
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 8, total_pages: 0 } });
  });

  it('registers a client through the staff registration endpoint', () => {
    let usuario = '';
    service.registrar(makeForm()).subscribe((registrado) => (usuario = registrado.usuario));

    const req = httpMock.expectOne(REGISTRO_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      nombres: 'Ana',
      numero_documento: '45288977',
      tipo_cliente: 'persona_natural',
      email: 'ana@correo.com',
    });
    expect(req.request.body).not.toHaveProperty('categoria_cliente');
    expect(req.request.body).not.toHaveProperty('username');
    expect(req.request.body).not.toHaveProperty('password');
    req.flush({
      id: 'u1',
      email: 'ana@correo.com',
      username: '45288977',
      email_verificado: false,
      debe_cambiar_contrasena: true,
    });

    expect(usuario).toBe('45288977');
  });

  it('updates a client with PATCH and without the email', () => {
    let nombres = '';
    service
      .actualizar('c1', makeForm({ nombres: 'Ana María' }))
      .subscribe((cliente) => (nombres = cliente.nombres));

    const req = httpMock.expectOne(`${CLIENTES_BASE}/c1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toMatchObject({ nombres: 'Ana María' });
    expect(req.request.body).not.toHaveProperty('email');
    req.flush(makeClienteDto({ nombres: 'Ana María' }));

    expect(nombres).toBe('Ana María');
  });

  it('deactivates a client with DELETE and returns the updated client', () => {
    let estado = true;
    service.desactivar('c1').subscribe((cliente) => (estado = cliente.estado));

    const req = httpMock.expectOne(`${CLIENTES_BASE}/c1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(makeClienteDto({ estado: false }));

    expect(estado).toBe(false);
  });

  it('reactivates a client with PATCH /activate', () => {
    let estado = false;
    service.activar('c1').subscribe((cliente) => (estado = cliente.estado));

    const req = httpMock.expectOne(`${CLIENTES_BASE}/c1/activate`);
    expect(req.request.method).toBe('PATCH');
    req.flush(makeClienteDto({ estado: true }));

    expect(estado).toBe(true);
  });
});
