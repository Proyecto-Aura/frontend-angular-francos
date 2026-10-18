import { IniciativaDto } from '../interfaces/iniciativa-dto.interface';
import { IniciativaForm } from '../interfaces/iniciativa.interface';
import {
  toActualizarIniciativaRequest,
  toCrearIniciativaRequest,
  toIniciativa,
} from './iniciativa.mapper';

function makeDto(overrides: Partial<IniciativaDto> = {}): IniciativaDto {
  return {
    id: 10,
    codigo: 'INI-001',
    nombre: 'Programa de fidelización',
    descripcion: 'Alcance',
    responsable: 'Ana Torres',
    fecha_inicio: '2026-01-15T00:00:00.000Z',
    fecha_fin: '2027-12-20',
    presupuesto: 15000.5,
    motivo_cancelacion: 'Cambio de prioridad',
    estado: true,
    estado_iniciativa: { id: 1, codigo: 'CANCELADA', nombre: 'Cancelada' },
    objetivo: {
      id: 20,
      nombre: 'Incrementar rentabilidad',
      perspectiva: { id: 1, nombre: 'Financiera' },
    },
    ...overrides,
  };
}

function makeForm(overrides: Partial<IniciativaForm> = {}): IniciativaForm {
  return {
    nombre: '  Programa de fidelización  ',
    descripcion: '  Alcance  ',
    objetivoId: 21,
    responsable: '  Ana Torres  ',
    fechaInicio: '2026-01-15',
    fechaFin: '2027-12-20',
    presupuesto: '15000.50',
    ...overrides,
  };
}

describe('iniciativa mapper', () => {
  it('maps dates, budget, cancellation reason, state, objective and perspective', () => {
    expect(toIniciativa(makeDto())).toEqual({
      id: 10,
      codigo: 'INI-001',
      nombre: 'Programa de fidelización',
      descripcion: 'Alcance',
      responsable: 'Ana Torres',
      fechaInicio: '2026-01-15',
      fechaFin: '2027-12-20',
      presupuesto: 15000.5,
      motivoCancelacion: 'Cambio de prioridad',
      estadoCodigo: 'CANCELADA',
      estadoNombre: 'Cancelada',
      objetivoId: 20,
      objetivoNombre: 'Incrementar rentabilidad',
      perspectivaId: 1,
      perspectivaNombre: 'Financiera',
    });
  });

  it('preserves null budget and cancellation reason', () => {
    expect(toIniciativa(makeDto({ presupuesto: null, motivo_cancelacion: null }))).toMatchObject({
      presupuesto: null,
      motivoCancelacion: null,
    });
  });

  it('maps create requests with trimmed text and numeric budget', () => {
    expect(toCrearIniciativaRequest(makeForm())).toEqual({
      objetivo_estrategico_id: 21,
      nombre: 'Programa de fidelización',
      descripcion: 'Alcance',
      responsable: 'Ana Torres',
      fecha_inicio: '2026-01-15',
      fecha_fin: '2027-12-20',
      presupuesto: 15000.5,
    });
  });

  it('omits empty optional fields from create requests', () => {
    const result = toCrearIniciativaRequest(makeForm({ descripcion: ' ', presupuesto: ' ' }));
    expect(result).not.toHaveProperty('descripcion');
    expect(result).not.toHaveProperty('presupuesto');
  });

  it('maps updates with objective, empty description and numeric budget', () => {
    expect(toActualizarIniciativaRequest(makeForm({ descripcion: ' ' }))).toEqual({
      objetivo_estrategico_id: 21,
      nombre: 'Programa de fidelización',
      descripcion: '',
      responsable: 'Ana Torres',
      fecha_inicio: '2026-01-15',
      fecha_fin: '2027-12-20',
      presupuesto: 15000.5,
    });
  });

  it('omits an empty budget from update requests', () => {
    expect(toActualizarIniciativaRequest(makeForm({ presupuesto: '' }))).not.toHaveProperty(
      'presupuesto',
    );
  });
});
