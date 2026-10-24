import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Cliente } from '../../interfaces/cliente.interface';
import { ClienteDetalleModal, formatearFecha } from './cliente-detalle-modal';

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

  function mostrar(cliente: Cliente | null): void {
    fixture.componentRef.setInput('cliente', cliente);
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(ClienteDetalleModal);
    component = fixture.componentInstance;
    cierres = 0;
    component.closed.subscribe(() => cierres++);
  });

  it('has nothing to show while there is no client', () => {
    mostrar(null);

    expect(component.titulo()).toBe('');
    expect(component.campos()).toEqual([]);
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

  describe('formatearFecha', () => {
    it('formats AAAA-MM-DD as DD/MM/AAAA without time zone shifts', () => {
      expect(formatearFecha('1989-04-17')).toBe('17/04/1989');
    });

    it('returns a dash for an invalid date', () => {
      expect(formatearFecha('')).toBe('—');
    });
  });
});
