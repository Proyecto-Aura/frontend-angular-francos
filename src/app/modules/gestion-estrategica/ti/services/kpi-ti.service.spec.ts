import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { KpiDto, KpiResumenDto, KpiValorDto } from '../../negocio/interfaces/kpi-dto.interface';
import { KpiForm } from '../../negocio/interfaces/kpi.interface';
import { KpiTiService } from './kpi-ti.service';

const BASE_URL = `${environment.apiUrl}/kpis-ti`;

function makeKpiDto(): KpiDto {
  return {
    id: 7,
    codigo: 'PE-0005-KPI-TI-001',
    nombre: 'Margen',
    formula: 'Utilidad / Ventas',
    estado: true,
    objetivo: { id: 5, nombre: 'Rentabilidad', perspectiva: { id: 1, nombre: 'Financiera' } },
    frecuencia: { id: 2, nombre: 'Trimestral' },
    unidad_medida: { id: 3, nombre: 'Porcentaje', simbolo: '%' },
    meta_final: 30,
    metas_por_anio: [],
  };
}

function makeResumenDto(): KpiResumenDto {
  return {
    ...makeKpiDto(),
    objetivo: { ...makeKpiDto().objetivo, responsable: 'Ana Torres' },
    ultimo_valor: null,
  };
}

function makeValorDto(): KpiValorDto {
  return {
    id: 1,
    anio: 2026,
    periodo: { id: 4, codigo: 'T1', nombre: 'Trimestre 1' },
    valor: 25,
    semaforo: { color: 'VERDE', color_hex: '#0f0' },
  };
}

function makeForm(): KpiForm {
  return {
    nombre: 'Margen',
    formula: 'Utilidad / Ventas',
    objetivoId: 5,
    frecuenciaId: 2,
    unidadId: 3,
    metas: [{ anio: 2026, meta: '30', operador: '>=', valorAmarillo: '20' }],
  };
}

describe('KpiTiService', () => {
  let service: KpiTiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(KpiTiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists KPIs by objective with pagination query params', () => {
    let result: unknown;
    service.listarPorObjetivo(5, 2, 10).subscribe((kpis) => (result = kpis));

    const req = httpMock.expectOne(
      (request) =>
        request.url === BASE_URL &&
        request.params.get('objetivo_estrategico_id') === '5' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [makeKpiDto()], meta: { total: 1, page: 2, limit: 10, total_pages: 1 } });
    expect(result).toEqual([
      expect.objectContaining({ id: 7, codigo: 'PE-0005-KPI-TI-001', objetivoId: 5 }),
    ]);
  });

  it('uses page 1 and limit 100 by default', () => {
    service.listarPorObjetivo(5).subscribe();

    const req = httpMock.expectOne(
      (request) =>
        request.url === BASE_URL &&
        request.params.get('objetivo_estrategico_id') === '5' &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [], meta: { total: 0, page: 1, limit: 100, total_pages: 0 } });
  });

  it('lists the KPI summaries for a plan', () => {
    let result: unknown;
    service.listarPorPlan(5).subscribe((kpis) => (result = kpis));

    const req = httpMock.expectOne(`${environment.apiUrl}/planes-estrategicos/5/kpis-ti`);
    expect(req.request.method).toBe('GET');
    req.flush([{ ...makeResumenDto(), ultimo_valor: makeValorDto() }]);
    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        objetivoResponsable: 'Ana Torres',
        ultimoValor: expect.objectContaining({ periodoId: 4, color: 'VERDE' }),
      }),
    ]);
  });

  it('creates a KPI with the mapped request', () => {
    service.crear(makeForm()).subscribe();

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      objetivo_estrategico_id: 5,
      nombre: 'Margen',
      formula: 'Utilidad / Ventas',
      frecuencia_id: 2,
      unidad_medida_id: 3,
      metas_por_anio: [
        {
          anio: 2026,
          meta: 30,
          operador_verde: '>=',
          operador_amarillo: '>=',
          valor_amarillo: 20,
        },
      ],
    });
    req.flush(makeKpiDto());
  });

  it('updates a KPI with the mapped request', () => {
    service.actualizar(7, makeForm()).subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      objetivo_estrategico_id: 5,
      nombre: 'Margen',
      formula: 'Utilidad / Ventas',
      frecuencia_id: 2,
      unidad_medida_id: 3,
      metas_por_anio: [
        {
          anio: 2026,
          meta: 30,
          operador_verde: '>=',
          operador_amarillo: '>=',
          valor_amarillo: 20,
        },
      ],
    });
    req.flush(makeKpiDto());
  });

  it('deletes a KPI and resolves to void', () => {
    let result: unknown = 'pending';
    service.eliminar(7).subscribe((value) => (result = value));

    const req = httpMock.expectOne(`${BASE_URL}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(result).toBeNull();
  });

  it('registers a KPI value', () => {
    let result: unknown;
    service.registrarValor(7, 2026, 3, 95).subscribe((value) => (result = value));

    const req = httpMock.expectOne(`${BASE_URL}/7/valores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ anio: 2026, periodo_id: 3, valor: 95 });
    req.flush({
      ...makeValorDto(),
      periodo: { id: 3, codigo: 'T3', nombre: 'Trimestre 3' },
      valor: 95,
    });
    expect(result).toEqual(expect.objectContaining({ periodoId: 3, valor: 95, color: 'VERDE' }));
  });

  it('lists and maps KPI values', () => {
    let result: unknown;
    service.listarValores(7).subscribe((values) => (result = values));

    const req = httpMock.expectOne(`${BASE_URL}/7/valores`);
    expect(req.request.method).toBe('GET');
    req.flush([makeValorDto()]);
    expect(result).toEqual([expect.objectContaining({ periodoId: 4, color: 'VERDE' })]);
  });

  it('gets the latest KPI value and preserves null responses', () => {
    let result: unknown = 'pending';
    service.obtenerUltimoValor(7).subscribe((value) => (result = value));

    const req = httpMock.expectOne(`${BASE_URL}/7/valores/ultimo`);
    expect(req.request.method).toBe('GET');
    req.flush(null);
    expect(result).toBeNull();
  });

  it('maps the latest KPI value when present', () => {
    let result: unknown;
    service.obtenerUltimoValor(7).subscribe((value) => (result = value));

    const req = httpMock.expectOne(`${BASE_URL}/7/valores/ultimo`);
    expect(req.request.method).toBe('GET');
    req.flush(makeValorDto());
    expect(result).toEqual({
      id: 1,
      anio: 2026,
      periodoId: 4,
      periodoNombre: 'Trimestre 1',
      valor: 25,
      color: 'VERDE',
    });
  });

  it('propagates an HTTP error to the plan subscriber', () => {
    const next = vi.fn();
    const error = vi.fn();
    service.listarPorPlan(5).subscribe({ next, error });

    httpMock
      .expectOne(`${environment.apiUrl}/planes-estrategicos/5/kpis-ti`)
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(expect.any(HttpErrorResponse));
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, error: { message: 'Forbidden' } }),
    );
  });
});
