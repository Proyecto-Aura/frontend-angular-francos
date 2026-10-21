import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { PlanEstrategicoDto } from '../../plan-estrategico/interfaces/plan-estrategico-dto.interface';
import { PerspectivaBscDto } from '../../negocio/interfaces/objetivo-estrategico-dto.interface';
import {
  ObjetivoEstrategicoTiDto,
  ResumenObjetivosTiPlanDto,
} from '../interfaces/objetivo-estrategico-ti-dto.interface';
import { ObjetivoEstrategicoTiForm } from '../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from './objetivo-estrategico-ti.service';

const API_URL = environment.apiUrl;
const OBJETIVOS_BASE = `${API_URL}/objetivos-estrategicos-ti`;

function makePerspectivaDto(): PerspectivaBscDto {
  return { id: 1, nombre: 'Financiera', descripcion: null, orden: 1 };
}

function makeObjetivoTiDto(
  overrides: Partial<ObjetivoEstrategicoTiDto> = {},
): ObjetivoEstrategicoTiDto {
  return {
    id: 7,
    codigo: 'OETI-0007',
    plan_estrategico_id: 5,
    perspectiva_bsc_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Modernizar la infraestructura',
    descripcion: null,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    perspectiva_bsc: makePerspectivaDto(),
    estado_objetivo: { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    relaciones_destino_ids: [],
    oe_negocio_id: 100,
    oe_negocio: { id: 100, codigo: 'OE-0100', nombre: 'Incrementar la rentabilidad' },
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

function makeForm(overrides: Partial<ObjetivoEstrategicoTiForm> = {}): ObjetivoEstrategicoTiForm {
  return {
    nombre: '  Modernizar la infraestructura  ',
    descripcion: '   ',
    responsable: '  Ana Torres  ',
    perspectivaId: 1,
    relacionesDestinoIds: [20],
    oeNegocioId: 100,
    ...overrides,
  };
}

describe('ObjetivoEstrategicoTiService', () => {
  let service: ObjetivoEstrategicoTiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ObjetivoEstrategicoTiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists and maps a flattened plan objective summary', () => {
    let result: unknown;
    service.listarPorPlan(5).subscribe((objetivos) => (result = objetivos));
    const resumen: ResumenObjetivosTiPlanDto = {
      plan: makePlanDto(),
      total_objetivos: 1,
      perspectivas: [{ perspectiva: makePerspectivaDto(), objetivos: [makeObjetivoTiDto()] }],
    };

    const req = httpMock.expectOne(`${API_URL}/planes-estrategicos/5/objetivos-estrategicos-ti`);
    expect(req.request.method).toBe('GET');
    req.flush(resumen);

    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        perspectivaNombre: 'Financiera',
        oeNegocio: { id: 100, codigo: 'OE-0100', nombre: 'Incrementar la rentabilidad' },
      }),
    ]);
  });

  it('registers an objective with its linked business objective', () => {
    service.registrar(5, makeForm()).subscribe();

    const req = httpMock.expectOne(OBJETIVOS_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      plan_estrategico_id: 5,
      perspectiva_bsc_id: 1,
      nombre: 'Modernizar la infraestructura',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [20],
      oe_negocio_id: 100,
    });
    req.flush(makeObjetivoTiDto());
  });

  it('updates an objective with the mapped request', () => {
    service.actualizar(7, makeForm()).subscribe();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      perspectiva_bsc_id: 1,
      nombre: 'Modernizar la infraestructura',
      descripcion: '',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [20],
      oe_negocio_id: 100,
    });
    req.flush(makeObjetivoTiDto());
  });

  it('changes an objective state', () => {
    service.cambiarEstado(7, 'EN_PROCESO').subscribe();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/7/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado_codigo: 'EN_PROCESO' });
    req.flush(
      makeObjetivoTiDto({ estado_objetivo: { codigo: 'EN_PROCESO', nombre: 'En proceso' } }),
    );
  });

  it('deletes an objective by id', () => {
    service.eliminar(7).subscribe();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('propagates an HTTP error to the subscriber', () => {
    let receivedStatus: number | undefined;
    service.listarPorPlan(5).subscribe({ error: (error) => (receivedStatus = error.status) });

    httpMock
      .expectOne(`${API_URL}/planes-estrategicos/5/objetivos-estrategicos-ti`)
      .flush({ message: 'No encontrado' }, { status: 404, statusText: 'Not Found' });

    expect(receivedStatus).toBe(404);
  });
});
