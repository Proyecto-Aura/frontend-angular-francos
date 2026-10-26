import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ClienteDto } from '../../interfaces/cliente-dto.interface';
import { Cliente } from '../../interfaces/cliente.interface';
import { ClienteFormModal } from './cliente-form-modal';

const CLIENTES_BASE = `${environment.apiUrl}/clientes`;
const REGISTRO_URL = `${environment.apiUrl}/auth/register/cliente`;
const UBIGEO_BASE = `${environment.apiUrl}/ubigeo`;

const DEPARTAMENTOS = [
  { id: '07', nombre: 'Callao' },
  { id: '15', nombre: 'Lima' },
];
const PROVINCIAS = [{ id: '1501', nombre: 'Lima' }];
const DISTRITOS = [
  { id: '150122', nombre: 'Miraflores' },
  { id: '150131', nombre: 'San Isidro' },
];

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

describe('ClienteFormModal', () => {
  let fixture: ComponentFixture<ClienteFormModal>;
  let component: ClienteFormModal;
  let httpMock: HttpTestingController;
  let avisos: string[];
  let cierres: number;

  function abrir(cliente: Cliente | null = null): void {
    fixture.componentRef.setInput('cliente', cliente);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    responderUbicaciones(cliente);
  }

  // Al abrir, el formulario pide los departamentos y, si edita, las provincias y
  // distritos de la ubicación del cliente.
  function responderUbicaciones(cliente: Cliente | null): void {
    httpMock.expectOne(`${UBIGEO_BASE}/departamentos`).flush(DEPARTAMENTOS);

    const ubicacion = cliente?.ubicacion;
    if (ubicacion) {
      httpMock
        .expectOne(
          (r) =>
            r.url === `${UBIGEO_BASE}/provincias` &&
            r.params.get('departamento_id') === ubicacion.departamento.id,
        )
        .flush(PROVINCIAS);
      httpMock
        .expectOne(
          (r) =>
            r.url === `${UBIGEO_BASE}/distritos` &&
            r.params.get('provincia_id') === ubicacion.provincia.id,
        )
        .flush(DISTRITOS);
    }
  }

  function completarAlta(): void {
    component.onNumeroDocumento('45288977');
    component.setCampo('nombres', 'Ana');
    component.setCampo('apellidoPaterno', 'Vega');
    component.setCampo('apellidoMaterno', 'Torres');
    component.setCampo('fechaNacimiento', '1989-04-17');
    component.setCampo('departamentoId', '15');
    component.setCampo('provinciaId', '1501');
    component.setCampo('distritoId', '150131');
    component.setCampo('direccion', 'Jr. Las Magnolias 312');
    component.setCampo('telefono', '944208877');
    component.setCampo('email', 'ana@correo.com');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ClienteFormModal);
    component = fixture.componentInstance;
    avisos = [];
    cierres = 0;
    component.saved.subscribe((aviso) => avisos.push(aviso));
    component.closed.subscribe(() => cierres++);
  });

  afterEach(() => httpMock.verify());

  it('opens an empty form to register a client', () => {
    abrir();

    expect(component.titulo()).toBe('Registrar cliente');
    expect(component.modoEdicion()).toBe(false);
    expect(component.f().numeroDocumento).toBe('');
    expect(component.f().categoria).toBe('minorista');
    expect(component.errores()).toEqual([]);
  });

  it('loads the client to edit', () => {
    abrir(makeCliente({ categoria: 'mayorista' }));

    expect(component.titulo()).toBe('Editar cliente');
    expect(component.modoEdicion()).toBe(true);
    expect(component.f()).toMatchObject({
      numeroDocumento: '45288977',
      nombres: 'Ana',
      categoria: 'mayorista',
      email: 'ana@correo.com',
      departamentoId: '15',
      provinciaId: '1501',
      distritoId: '150131',
    });
    expect(component.provinciaOptions()).toEqual([{ value: '1501', label: 'Lima' }]);
    expect(component.distritoOptions().map((o) => o.label)).toEqual(['Miraflores', 'San Isidro']);
  });

  it('loads the departments when the form opens', () => {
    abrir();

    expect(component.departamentoOptions()).toEqual([
      { value: '07', label: 'Callao' },
      { value: '15', label: 'Lima' },
    ]);
    expect(component.provinciaOptions()).toEqual([]);
    expect(component.distritoOptions()).toEqual([]);
  });

  it('asks for the provinces of the chosen department and clears the lower levels', () => {
    abrir();
    component.setCampo('provinciaId', '1501');
    component.setCampo('distritoId', '150131');

    component.onDepartamento('15');

    expect(component.f()).toMatchObject({ departamentoId: '15', provinciaId: '', distritoId: '' });
    httpMock
      .expectOne(
        (r) => r.url === `${UBIGEO_BASE}/provincias` && r.params.get('departamento_id') === '15',
      )
      .flush(PROVINCIAS);
    expect(component.provinciaOptions()).toEqual([{ value: '1501', label: 'Lima' }]);
    expect(component.distritoOptions()).toEqual([]);
  });

  it('asks for the districts of the chosen province and clears the district', () => {
    abrir();
    component.onDepartamento('15');
    httpMock.expectOne((r) => r.url === `${UBIGEO_BASE}/provincias`).flush(PROVINCIAS);
    component.setCampo('distritoId', '150131');

    component.onProvincia('1501');

    expect(component.f()).toMatchObject({ provinciaId: '1501', distritoId: '' });
    httpMock
      .expectOne(
        (r) => r.url === `${UBIGEO_BASE}/distritos` && r.params.get('provincia_id') === '1501',
      )
      .flush(DISTRITOS);
    expect(component.distritoOptions()).toHaveLength(2);

    component.onDistrito('150122');
    expect(component.f().distritoId).toBe('150122');
  });

  it('empties the lower levels without asking when the department is cleared', () => {
    abrir(makeCliente());

    component.onDepartamento('');

    expect(component.f()).toMatchObject({ departamentoId: '', provinciaId: '', distritoId: '' });
    expect(component.provinciaOptions()).toEqual([]);
    expect(component.distritoOptions()).toEqual([]);
    httpMock.expectNone((r) => r.url === `${UBIGEO_BASE}/provincias`);
  });

  it('discards the provinces of a department that is no longer the chosen one', () => {
    abrir();

    component.onDepartamento('15');
    const lima = httpMock.expectOne(
      (r) => r.url === `${UBIGEO_BASE}/provincias` && r.params.get('departamento_id') === '15',
    );
    component.onDepartamento('07');
    const callao = httpMock.expectOne(
      (r) => r.url === `${UBIGEO_BASE}/provincias` && r.params.get('departamento_id') === '07',
    );

    lima.flush(PROVINCIAS);
    expect(component.provinciaOptions()).toEqual([]);

    callao.flush([{ id: '0701', nombre: 'Callao' }]);
    expect(component.provinciaOptions()).toEqual([{ value: '0701', label: 'Callao' }]);
  });

  it('shows an error when the locations cannot be loaded', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    httpMock
      .expectOne(`${UBIGEO_BASE}/departamentos`)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(component.errorGeneral()).toBe(
      'No se pudo cargar la lista de ubicaciones. Cierre e intente nuevamente.',
    );
  });

  it('shows the format hint of the chosen document type', () => {
    abrir();
    expect(component.pistaDocumento()).toBe('Debe tener 8 caracteres.');

    component.onTipoDocumento('ruc');
    expect(component.pistaDocumento()).toContain('11 caracteres');

    component.onTipoDocumento('pasaporte');
    expect(component.pistaDocumento()).toContain('6 a 12');
  });

  it('switches to the company fields when the document is an RUC 20 and clears the personal ones', () => {
    abrir();
    component.setCampo('fechaNacimiento', '1989-04-17');
    component.setCampo('direccion', 'Jr. Las Magnolias 312');

    component.onTipoDocumento('ruc');
    component.onNumeroDocumento('20548712345');

    expect(component.esEmpresa()).toBe(true);
    expect(component.f().fechaNacimiento).toBe('');
    expect(component.f().direccion).toBe('');
  });

  it('treats an RUC 10 as a natural person', () => {
    abrir();

    component.onTipoDocumento('ruc');
    component.onNumeroDocumento('10512477903');

    expect(component.esEmpresa()).toBe(false);
  });

  it('only the RUC 20 shows the company layout with the contact section', () => {
    abrir();
    const en = (id: string) => fixture.nativeElement.querySelector(`#${id}`);
    const contacto = () => fixture.nativeElement.querySelector('[aria-label="Datos del contacto"]');

    // DNI: bloque de persona natural.
    expect(en('cliente-nacimiento')).not.toBeNull();
    expect(en('cliente-razon-social')).toBeNull();
    expect(contacto()).toBeNull();

    for (const [tipo, numero] of [
      ['ruc', '10512477903'],
      ['ce', '123456789'],
      ['pasaporte', 'A1234567'],
    ]) {
      component.onTipoDocumento(tipo);
      component.onNumeroDocumento(numero);
      fixture.detectChanges();
      expect(en('cliente-nacimiento')).not.toBeNull();
      expect(contacto()).toBeNull();
    }

    component.onTipoDocumento('ruc');
    component.onNumeroDocumento('20548712345');
    fixture.detectChanges();
    expect(en('cliente-razon-social')).not.toBeNull();
    expect(en('cliente-nacimiento')).toBeNull();
    expect(contacto()).not.toBeNull();
  });

  it('asks for a single email in a company: the contact one, in the contact section', () => {
    abrir();
    const correos = () => fixture.nativeElement.querySelectorAll('#cliente-email');
    const etiqueta = () =>
      (fixture.nativeElement.querySelector('label[for="cliente-email"]') as HTMLElement)
        .textContent;

    expect(correos().length).toBe(1);
    expect(etiqueta()).toContain('Correo');
    expect(etiqueta()).not.toContain('contacto');

    component.onTipoDocumento('ruc');
    component.onNumeroDocumento('20548712345');
    fixture.detectChanges();

    expect(correos().length).toBe(1);
    expect(etiqueta()).toContain('Correo electrónico del contacto');
    expect(
      fixture.nativeElement.querySelector('[aria-label="Datos del contacto"] #cliente-email'),
    ).not.toBeNull();
    expect(component.pistaCorreo()).toContain('correo de verificación');
  });

  it('clears the business name when the document stops being an RUC 20', () => {
    abrir();
    component.onTipoDocumento('ruc');
    component.onNumeroDocumento('20548712345');
    component.setCampo('razonSocial', 'Distribuidora Andes S.A.C.');

    component.onTipoDocumento('dni');

    expect(component.esEmpresa()).toBe(false);
    expect(component.f().razonSocial).toBe('');
  });

  it('removes spaces from the document number', () => {
    abrir();

    component.onNumeroDocumento(' 4528 8977 ');

    expect(component.f().numeroDocumento).toBe('45288977');
  });

  it('does not save an invalid form and lists what is missing', () => {
    abrir();

    component.guardar();

    expect(component.errores()).toContain('número de documento');
    expect(component.errores()).toContain('correo');
    expect(avisos).toEqual([]);
    expect(cierres).toBe(0);
    httpMock.expectNone(REGISTRO_URL);
  });

  it('registers a valid client, emits the notice and closes', () => {
    abrir();
    completarAlta();

    component.guardar();

    const req = httpMock.expectOne(REGISTRO_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ distrito_id: '150131' });
    expect(component.guardando()).toBe(true);
    req.flush({
      id: 'u1',
      email: 'ana@correo.com',
      username: '45288977',
      email_verificado: false,
      debe_cambiar_contrasena: true,
    });

    expect(component.guardando()).toBe(false);
    expect(avisos).toEqual([
      'Cliente registrado · cuenta 45288977 creada con credenciales iniciales para ana@correo.com.',
    ]);
    expect(cierres).toBe(1);
  });

  it('updates the edited client without asking for the email', () => {
    abrir(makeCliente({ email: '' }));
    component.setCampo('telefono', '955555555');

    component.guardar();

    const req = httpMock.expectOne(`${CLIENTES_BASE}/c1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toMatchObject({ telefono: '955555555' });
    req.flush(makeClienteDto({ telefono: '955555555' }));

    expect(avisos).toEqual(['Cliente Ana Vega Torres actualizado.']);
    expect(cierres).toBe(1);
  });

  it('shows the backend message when the document is already registered (409)', () => {
    abrir();
    completarAlta();

    component.guardar();
    httpMock
      .expectOne(REGISTRO_URL)
      .flush(
        { message: 'Existe una persona con ese mismo numero de documento' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(component.errorGeneral()).toBe('Existe una persona con ese mismo numero de documento');
    expect(component.guardando()).toBe(false);
    expect(avisos).toEqual([]);
    expect(cierres).toBe(0);
  });

  it('joins several backend validation messages (400)', () => {
    abrir();
    completarAlta();

    component.guardar();
    httpMock
      .expectOne(REGISTRO_URL)
      .flush(
        { message: ['telefono debe contener 9 digitos', 'El correo no es válido'] },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(component.errorGeneral()).toBe(
      'telefono debe contener 9 digitos El correo no es válido',
    );
  });

  it('explains missing permissions (403)', () => {
    abrir();
    completarAlta();

    component.guardar();
    httpMock.expectOne(REGISTRO_URL).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(component.errorGeneral()).toBe('No tiene permisos para gestionar clientes.');
  });

  it('shows a generic message on unexpected errors', () => {
    abrir();
    completarAlta();

    component.guardar();
    httpMock.expectOne(REGISTRO_URL).flush({}, { status: 500, statusText: 'Server Error' });

    expect(component.errorGeneral()).toBe('No se pudo guardar el cliente. Intente nuevamente.');
  });

  it('closes without saving', () => {
    abrir();

    component.cerrar();

    expect(cierres).toBe(1);
    expect(avisos).toEqual([]);
  });
});
