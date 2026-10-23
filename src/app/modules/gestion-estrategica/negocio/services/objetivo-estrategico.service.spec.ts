import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { PlanEstrategicoDto } from '../../plan-estrategico/interfaces/plan-estrategico-dto.interface';
import {
  ObjetivoEstrategicoDto,
  PerspectivaBscDto,
  ResumenObjetivosPlanDto,
} from '../interfaces/objetivo-estrategico-dto.interface';
import { ObjetivoEstrategicoForm } from '../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoService } from './objetivo-estrategico.service';

const API_URL = environment.apiUrl;
const OBJETIVOS_BASE = `${API_URL}/objetivos-estrategicos`;

function makePerspectivaDto(overrides: Partial<PerspectivaBscDto> = {}): PerspectivaBscDto {
  return {
    id: 1,
    nombre: 'Financiera',
    descripcion: null,
    orden: 1,
    ...overrides,
  };
}

function makeObjetivoDto(overrides: Partial<ObjetivoEstrategicoDto> = {}): ObjetivoEstrategicoDto {
  return {
    id: 10,
    codigo: 'OE-0010',
    plan_estrategico_id: 5,
    perspectiva_bsc_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Incrementar la rentabilidad',
    descripcion: null,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    perspectiva_bsc: makePerspectivaDto(),
    estado_objetivo: { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    relaciones_destino_ids: [],
    ...overrides,
  };
}

function makePlanDto(): PlanEstrategicoDto {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anio_inicio: 2026,
    anio_fin: 2028,
    estado_plan_id: 1,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    estado_plan: { codigo: 'BORRADOR', nombre: 'Borrador' },
  };
}

function makeForm(overrides: Partial<ObjetivoEstrategicoForm> = {}): ObjetivoEstrategicoForm {
  return {
    nombre: '  Incrementar la rentabilidad  ',
    descripcion: '   ',
    responsable: '  Ana Torres  ',
    perspectivaId: 1,
    relacionesDestinoIds: [20],
    ...overrides,
  };
}

describe('ObjetivoEstrategicoService', () => {
  let service: ObjetivoEstrategicoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ObjetivoEstrategicoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists and maps BSC perspectives', () => {
    let result: unknown;
    service.listarPerspectivas().subscribe((perspectivas) => (result = perspectivas));

    const req = httpMock.expectOne(`${API_URL}/perspectivas-bsc`);
    expect(req.request.method).toBe('GET');
    req.flush([makePerspectivaDto()]);

    expect(result).toEqual([{ id: 1, nombre: 'Financiera', orden: 1 }]);
  });

  it('lists a plan objective summary as a flattened array', () => {
    let result: unknown;
    service.listarPorPlan(5).subscribe((objetivos) => (result = objetivos));
    const resumen: ResumenObjetivosPlanDto = {
      plan: makePlanDto(),
      total_objetivos: 2,
      perspectivas: [
        {
          perspectiva: makePerspectivaDto(),
          objetivos: [makeObjetivoDto({ id: 1 }), makeObjetivoDto({ id: 2 })],
        },
      ],
    };

    const req = httpMock.expectOne(`${API_URL}/planes-estrategicos/5/objetivos-estrategicos`);
    expect(req.request.method).toBe('GET');
    req.flush(resumen);

    expect(result).toEqual([
      expect.objectContaining({ id: 1, perspectivaNombre: 'Financiera' }),
      expect.objectContaining({ id: 2, perspectivaNombre: 'Financiera' }),
    ]);
  });

  it('registers an objective with the mapped create request', () => {
    service.registrar(5, makeForm()).subscribe();

    const req = httpMock.expectOne(OBJETIVOS_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      plan_estrategico_id: 5,
      perspectiva_bsc_id: 1,
      nombre: 'Incrementar la rentabilidad',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [20],
    });
    req.flush(makeObjetivoDto());
  });

  it('updates an objective with the mapped update request', () => {
    service.actualizar(10, makeForm()).subscribe();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      perspectiva_bsc_id: 1,
      nombre: 'Incrementar la rentabilidad',
      descripcion: '',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [20],
    });
    req.flush(makeObjetivoDto());
  });

  it('changes an objective state', () => {
    service.cambiarEstado(10, 'EN_PROCESO').subscribe();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/10/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado_codigo: 'EN_PROCESO' });
    req.flush(makeObjetivoDto({ estado_objetivo: { codigo: 'EN_PROCESO', nombre: 'En proceso' } }));
  });

  it('deletes an objective by id', () => {
    service.eliminar(10).subscribe();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
