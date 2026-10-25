import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PedidoResumenDto } from '../../../mis-pedidos/interfaces/pedido-dto.interface';
import { Cliente } from '../../interfaces/cliente.interface';
import { ClienteDetalleModal, formatearFecha } from './cliente-detalle-modal';

const PEDIDOS_BASE = `${environment.apiUrl}/pedidos`;

function makePedidoDto(overrides: Partial<PedidoResumenDto> = {}): PedidoResumenDto {
  return {
    id: 1,
    codigo: 'PED-000001',
    cliente: { id: 'c1', nombre: 'Ana Vega Torres' },
    metodo_pago: 'efectivo',
    total: 124.8,
    tipo_entrega: 'delivery',
    estado: 'entregado',
    origen: 'manual',
    created_at: '2026-09-09T15:00:00.000Z',
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

describe('ClienteDetalleModal', () => {
  let fixture: ComponentFixture<ClienteDetalleModal>;
  let component: ClienteDetalleModal;
  let cierres: number;
  let httpMock: HttpTestingController;

  /** Abre el modal y responde la consulta del historial (vacío por defecto). */
  function mostrar(cliente: Cliente | null, pedidos: PedidoResumenDto[] = []): void {
    mostrarSinResponder(cliente);
    if (cliente) {
      responderHistorial(pedidos);
    }
  }

  function mostrarSinResponder(cliente: Cliente | null): void {
    fixture.componentRef.setInput('cliente', cliente);
    fixture.detectChanges();
  }

  function responderHistorial(pedidos: PedidoResumenDto[]): void {
    httpMock
      .expectOne((r) => r.url === PEDIDOS_BASE)
      .flush({
        data: pedidos,
        meta: { total: pedidos.length, page: 1, limit: 100, total_pages: 1 },
      });
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ClienteDetalleModal);
    component = fixture.componentInstance;
    cierres = 0;
    component.closed.subscribe(() => cierres++);
  });

  afterEach(() => httpMock.verify());

  it('has nothing to show while there is no client', () => {
    mostrar(null);

    expect(component.titulo()).toBe('');
    expect(component.campos()).toEqual([]);
    expect(component.pedidos()).toEqual([]);
    httpMock.expectNone((r) => r.url === PEDIDOS_BASE);
  });

  it('shows the data of a natural person', () => {
    mostrar(makeCliente());

    expect(component.titulo()).toBe('Ana Vega Torres');
    expect(component.campos()).toEqual([
      { label: 'Código', value: 'CLI-000001' },
      { label: 'Tipo de persona', value: 'Persona natural' },
      { label: 'Tipo de cliente', value: 'Minorista' },
      { label: 'DNI', value: '45288977' },
      { label: 'Fecha de nacimiento', value: '17/04/1989' },
      { label: 'Ubicación', value: 'San Isidro, Lima, Lima' },
      { label: 'Dirección', value: 'Jr. Las Magnolias 312' },
      { label: 'Teléfono', value: '944208877' },
      { label: 'Correo', value: 'ana@correo.com' },
    ]);
  });

  it('shows the business name and the contact of a company', () => {
    mostrar(
      makeCliente({
        tipoCliente: 'empresa',
        razonSocial: 'Distribuidora Andes S.A.C.',
        categoria: 'mayorista',
        tipoDocumento: 'ruc',
        numeroDocumento: '20548712345',
        nombres: 'Rosa',
        apellidoPaterno: 'Quispe',
        apellidoMaterno: 'Huamán',
        fechaNacimiento: '',
        direccion: '',
      }),
    );

    expect(component.titulo()).toBe('Distribuidora Andes S.A.C.');
    expect(component.campos()).toEqual([
      { label: 'Código', value: 'CLI-000001' },
      { label: 'Tipo de persona', value: 'Empresa' },
      { label: 'Tipo de cliente', value: 'Mayorista' },
      { label: 'RUC', value: '20548712345' },
      { label: 'Razón social', value: 'Distribuidora Andes S.A.C.' },
      { label: 'Contacto', value: 'Rosa Quispe Huamán' },
      { label: 'Teléfono', value: '944208877' },
      { label: 'Correo de la empresa', value: 'ana@correo.com' },
    ]);
  });

  it('shows a dash for the data the client does not have', () => {
    mostrar(
      makeCliente({
        telefono: '',
        email: '',
        fechaNacimiento: '',
        direccion: '',
        ubicacion: null,
      }),
    );

    const valores = Object.fromEntries(component.campos().map((c) => [c.label, c.value]));
    expect(valores['Teléfono']).toBe('—');
    expect(valores['Correo']).toBe('—');
    expect(valores['Fecha de nacimiento']).toBe('—');
    expect(valores['Dirección']).toBe('—');
    expect(valores['Ubicación']).toBe('—');
  });

  it('closes', () => {
    mostrar(makeCliente());

    component.cerrar();

    expect(cierres).toBe(1);
  });

  describe('historial de pedidos', () => {
    it('asks for the orders of the client shown', () => {
      mostrarSinResponder(makeCliente({ id: 'c7' }));

      expect(component.cargandoPedidos()).toBe(true);
      const req = httpMock.expectOne((r) => r.url === PEDIDOS_BASE);
      expect(req.request.params.get('cliente_id')).toBe('c7');
      expect(req.request.params.get('estado')).toBe('entregado');
      req.flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
    });

    it('lists the delivered orders from the newest to the oldest', () => {
      mostrar(makeCliente(), [
        makePedidoDto({ id: 1, codigo: 'PED-000001', created_at: '2026-09-01T15:00:00Z' }),
        makePedidoDto({ id: 2, codigo: 'PED-000002', created_at: '2026-09-20T15:00:00Z' }),
      ]);

      expect(component.cargandoPedidos()).toBe(false);
      expect(component.errorPedidos()).toBe(false);
      expect(component.pedidos().map((p) => p.codigo)).toEqual(['PED-000002', 'PED-000001']);
    });

    it('shows no orders for a client without finished orders', () => {
      mostrar(makeCliente(), []);

      expect(component.cargandoPedidos()).toBe(false);
      expect(component.errorPedidos()).toBe(false);
      expect(component.pedidos()).toEqual([]);
    });

    it('reports the error without hiding the data of the client', () => {
      mostrarSinResponder(makeCliente());

      httpMock
        .expectOne((r) => r.url === PEDIDOS_BASE)
        .flush({}, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(component.errorPedidos()).toBe(true);
      expect(component.pedidos()).toEqual([]);
      expect(component.campos().length).toBeGreaterThan(0);
    });

    it('asks again when another client is shown', () => {
      mostrar(makeCliente({ id: 'c1' }), [makePedidoDto({ id: 1, codigo: 'PED-000001' })]);
      expect(component.pedidos().map((p) => p.codigo)).toEqual(['PED-000001']);

      mostrar(makeCliente({ id: 'c2' }), []);

      expect(component.pedidos()).toEqual([]);
    });
  });

  describe('formatearFecha', () => {
    it('formats AAAA-MM-DD as DD/MM/AAAA without time zone shifts', () => {
      expect(formatearFecha('1989-04-17')).toBe('17/04/1989');
    });

    it('returns a dash for an invalid date', () => {
      expect(formatearFecha('')).toBe('—');
    });
  });
});
