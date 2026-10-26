import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ClienteDto } from '../../interfaces/cliente-dto.interface';
import { Cliente } from '../../interfaces/cliente.interface';
import { ListarClientes } from './listar-clientes';

const CLIENTES_BASE = `${environment.apiUrl}/clientes`;

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

function makeCliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
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
    ...overrides,
  };
}

describe('ListarClientes', () => {
  let fixture: ComponentFixture<ListarClientes>;
  let page: ListarClientes;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function expectListRequest(pagina: number): TestRequest {
    return httpMock.expectOne(
      (request) =>
        request.method === 'GET' &&
        request.url === CLIENTES_BASE &&
        request.params.get('page') === String(pagina) &&
        request.params.get('limit') === '5',
    );
  }

  function flushList(
    req: TestRequest,
    data: ClienteDto[] = [],
    meta = { total: data.length, page: 1, limit: 5, total_pages: data.length > 0 ? 1 : 0 },
  ): void {
    req.flush({ data, meta });
  }

  /** Crea la página y responde la primera carga con los clientes dados. */
  function create(data: ClienteDto[] = [makeClienteDto()]): void {
    fixture = TestBed.createComponent(ListarClientes);
    page = fixture.componentInstance;
    fixture.detectChanges();
    flushList(expectListRequest(1), data);
    fixture.detectChanges();
  }

  it('loads page one on initialization and shows the clients', () => {
    create([makeClienteDto(), makeClienteDto({ id: 'c2' })]);

    expect(page.cargando()).toBe(false);
    expect(page.errorCarga()).toBe(false);
    expect(page.clientes().map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(page.total()).toBe(2);
    expect(page.columnas().map((c) => c.key)).toEqual([
      'codigo',
      'nombre',
      'documento',
      'categoria',
      'telefono',
      'estado',
      'acciones',
    ]);
  });

  it('shows the footer only when there are clients to count', () => {
    create([makeClienteDto(), makeClienteDto({ id: 'c2' })]);
    expect(page.mostrarPie()).toBe(true);

    page.setQuery('zzz');
    flushList(
      httpMock.expectOne((r) => r.url === CLIENTES_BASE && r.params.get('search') === 'zzz'),
      [],
    );
    expect(page.mostrarPie()).toBe(false);
  });

  it('shows the loading state until the backend answers', () => {
    fixture = TestBed.createComponent(ListarClientes);
    page = fixture.componentInstance;
    fixture.detectChanges();

    expect(page.cargando()).toBe(true);

    flushList(expectListRequest(1));
    expect(page.cargando()).toBe(false);
  });

  it('shows an error and retries the load', () => {
    fixture = TestBed.createComponent(ListarClientes);
    page = fixture.componentInstance;
    fixture.detectChanges();
    expectListRequest(1).flush({}, { status: 500, statusText: 'Server Error' });

    expect(page.errorCarga()).toBe(true);
    expect(page.clientes()).toEqual([]);

    page.cargarClientes();
    expect(page.errorCarga()).toBe(false);
    flushList(expectListRequest(1), [makeClienteDto()]);

    expect(page.clientes()).toHaveLength(1);
  });

  it('searches in the backend and goes back to page one', () => {
    create();

    page.setQuery('  ana  ');

    const req = httpMock.expectOne(
      (request) => request.url === CLIENTES_BASE && request.params.get('search') === 'ana',
    );
    expect(req.request.params.get('page')).toBe('1');
    flushList(req, [makeClienteDto()]);
  });

  it('sends each filter as the query param of the backend', () => {
    create();

    page.setCategoria('mayorista');
    flushList(httpMock.expectOne((r) => r.params.get('categoria_cliente') === 'mayorista'));

    page.setEstado('false');
    flushList(
      httpMock.expectOne(
        (r) =>
          r.params.get('estado') === 'false' && r.params.get('categoria_cliente') === 'mayorista',
      ),
    );
  });

  it('clears a filter when the empty option is chosen', () => {
    create();
    page.setEstado('true');
    flushList(httpMock.expectOne((r) => r.params.get('estado') === 'true'));

    page.setEstado('');

    const req = httpMock.expectOne((r) => r.url === CLIENTES_BASE && !r.params.has('estado'));
    flushList(req);
  });

  it('requests another page only when it exists', () => {
    create([makeClienteDto()]);
    page.totalPaginas.set(2);

    page.cambiarPagina(5);
    page.cambiarPagina(1);
    httpMock.expectNone((r) => r.url === CLIENTES_BASE);

    page.cambiarPagina(2);
    flushList(expectListRequest(2), [makeClienteDto({ id: 'c9' })], {
      total: 9,
      page: 2,
      limit: 5,
      total_pages: 2,
    });

    expect(page.pagina()).toBe(2);
    expect(page.clientes().map((c) => c.id)).toEqual(['c9']);
  });

  it('opens the form to register a client', () => {
    create();

    page.nuevoCliente();

    expect(page.modalFormAbierto()).toBe(true);
    expect(page.clienteEnEdicion()).toBeNull();
  });

  it('opens the form to edit the selected client and closes it', () => {
    create();
    const cliente = page.clientes()[0];

    page.editarCliente(cliente);
    expect(page.modalFormAbierto()).toBe(true);
    expect(page.clienteEnEdicion()).toBe(cliente);

    page.cerrarForm();
    expect(page.modalFormAbierto()).toBe(false);
    expect(page.clienteEnEdicion()).toBeNull();
  });

  it('shows the notice and reloads the list after saving', () => {
    create();

    page.clienteGuardado('Cliente registrado.');

    expect(page.aviso()).toBe('Cliente registrado.');
    expect(page.avisoTono()).toBe('ok');
    flushList(expectListRequest(1), [makeClienteDto()]);
  });

  it('opens the detail of a client', () => {
    create();
    const cliente = page.clientes()[0];

    page.verCliente(cliente);

    expect(page.clienteEnDetalle()).toBe(cliente);
  });

  it('closes the detail and opens the edit form when editing from the detail', () => {
    create();
    const cliente = page.clientes()[0];
    page.verCliente(cliente);

    page.editarDesdeDetalle(cliente);

    expect(page.clienteEnDetalle()).toBeNull();
    expect(page.clienteEnEdicion()).toBe(cliente);
    expect(page.modalFormAbierto()).toBe(true);
  });

  it('asks for confirmation before deactivating and can cancel', () => {
    create();
    const cliente = page.clientes()[0];

    page.pedirDesactivar(cliente);
    expect(page.clienteADesactivar()).toBe(cliente);

    page.cancelarDesactivar();
    expect(page.clienteADesactivar()).toBeNull();
    httpMock.expectNone((r) => r.method === 'DELETE');
  });

  it('deactivates logically, shows the notice and reloads', () => {
    create();
    page.pedirDesactivar(page.clientes()[0]);

    page.confirmarDesactivar();

    const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url === `${CLIENTES_BASE}/c1`);
    expect(page.procesandoEstado()).toBe(true);
    req.flush(makeClienteDto({ estado: false }));

    expect(page.procesandoEstado()).toBe(false);
    expect(page.clienteADesactivar()).toBeNull();
    expect(page.aviso()).toBe('Cliente Ana Vega Torres desactivado.');
    expect(page.avisoTono()).toBe('ok');
    flushList(expectListRequest(1), [makeClienteDto({ estado: false })]);
  });

  it('shows an error notice when the deactivation fails', () => {
    create();
    page.pedirDesactivar(page.clientes()[0]);

    page.confirmarDesactivar();
    httpMock
      .expectOne((r) => r.method === 'DELETE')
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(page.aviso()).toBe('No se pudo cambiar el estado del cliente. Intente nuevamente.');
    expect(page.avisoTono()).toBe('error');
    expect(page.clienteADesactivar()).toBeNull();
  });

  it('does nothing when confirming without a selected client', () => {
    create();

    page.confirmarDesactivar();

    httpMock.expectNone((r) => r.method === 'DELETE');
  });

  it('reactivates an inactive client, shows the notice and reloads', () => {
    create([makeClienteDto({ estado: false })]);

    page.reactivarCliente(page.clientes()[0]);

    const req = httpMock.expectOne(
      (r) => r.method === 'PATCH' && r.url === `${CLIENTES_BASE}/c1/activate`,
    );
    req.flush(makeClienteDto({ estado: true }));

    expect(page.aviso()).toBe('Cliente Ana Vega Torres reactivado.');
    flushList(expectListRequest(1), [makeClienteDto()]);
  });

  it('shows an error notice when the reactivation fails', () => {
    create([makeClienteDto({ estado: false })]);

    page.reactivarCliente(page.clientes()[0]);
    httpMock
      .expectOne((r) => r.method === 'PATCH')
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(page.avisoTono()).toBe('error');
  });

  it('maps the category and the state to badge tone and label', () => {
    create();

    expect(page.categoriaTone('mayorista')).toBe('brand');
    expect(page.categoriaTone('minorista')).toBe('neutral');
    expect(page.categoriaLabel('mayorista')).toBe('Mayorista');
    expect(page.estadoTone(true)).toBe('success');
    expect(page.estadoTone(false)).toBe('neutral');
    expect(page.documentoLabel(makeCliente({ tipoDocumento: 'ruc' }))).toBe('RUC');
  });
});
