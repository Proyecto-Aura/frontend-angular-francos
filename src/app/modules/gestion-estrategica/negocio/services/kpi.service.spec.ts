import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { KpiDto, KpiResumenDto, KpiValorDto } from '../interfaces/kpi-dto.interface';
import { KpiForm } from '../interfaces/kpi.interface';
import { KpiService } from './kpi.service';

const BASE_URL = `${environment.apiUrl}/kpis`;

function makeKpiDto(): KpiDto {
  return {
    id: 10,
    codigo: 'KPI-001',
    nombre: 'Margen',
    formula: 'Utilidad / Ventas',
    estado: true,
    objetivo: { id: 20, nombre: 'Rentabilidad', perspectiva: { id: 1, nombre: 'Financiera' } },
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
    objetivoId: 20,
    frecuenciaId: 2,
    unidadId: 3,
    metas: [{ anio: 2026, meta: '30', operador: '>=', valorAmarillo: '20' }],
  };
}

describe('KpiService', () => {
  let service: KpiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(KpiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists KPIs by objective with pagination query params', () => {
    let result: unknown;
    service.listarPorObjetivo(20, 2, 50).subscribe((kpis) => (result = kpis));

    const req = httpMock.expectOne(
      (request) =>
        request.url === BASE_URL &&
        request.params.get('objetivo_estrategico_id') === '20' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '50',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [makeKpiDto()], meta: { total: 1, page: 2, limit: 50, total_pages: 1 } });
    expect(result).toEqual([expect.objectContaining({ id: 10 })]);
  });

  it('lists the KPI summaries for a plan', () => {
    service.listarPorPlan(5).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/planes-estrategicos/5/kpis`);
    expect(req.request.method).toBe('GET');
    req.flush([makeResumenDto()]);
  });

  it('creates a KPI with the mapped request', () => {
    service.crear(makeForm()).subscribe();

    const req = httpMock.expectOne(BASE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(
      expect.objectContaining({ objetivo_estrategico_id: 20, metas_por_anio: expect.any(Array) }),
    );
    req.flush(makeKpiDto());
  });

  it('updates a KPI with the mapped request', () => {
    service.actualizar(10, makeForm()).subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.objetivo_estrategico_id).toBe(20);
    req.flush(makeKpiDto());
  });

  it('deletes a KPI and resolves to void', () => {
    let result: unknown = 'pending';
    service.eliminar(10).subscribe((value) => (result = value));

    const req = httpMock.expectOne(`${BASE_URL}/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(result).toBeNull();
  });

  it('registers a KPI value', () => {
    service.registrarValor(10, 2026, 4, 25).subscribe();

    const req = httpMock.expectOne(`${BASE_URL}/10/valores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ anio: 2026, periodo_id: 4, valor: 25 });
    req.flush(makeValorDto());
  });

  it('lists and maps KPI values', () => {
    let result: unknown;
    service.listarValores(10).subscribe((values) => (result = values));

    const req = httpMock.expectOne(`${BASE_URL}/10/valores`);
    expect(req.request.method).toBe('GET');
    req.flush([makeValorDto()]);
    expect(result).toEqual([expect.objectContaining({ periodoId: 4, color: 'VERDE' })]);
  });

  it('gets the latest KPI value and preserves null responses', () => {
    let result: unknown = 'pending';
    service.obtenerUltimoValor(10).subscribe((value) => (result = value));

    const req = httpMock.expectOne(`${BASE_URL}/10/valores/ultimo`);
    expect(req.request.method).toBe('GET');
    req.flush(null);
    expect(result).toBeNull();
  });
});
