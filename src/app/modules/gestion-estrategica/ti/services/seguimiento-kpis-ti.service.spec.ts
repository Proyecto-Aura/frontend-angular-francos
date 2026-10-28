import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import {
  SeguimientoKpiDto,
  SeguimientoKpisDto,
} from '../../negocio/interfaces/seguimiento-kpis-dto.interface';
import { SeguimientoKpis } from '../../negocio/interfaces/seguimiento-kpis.interface';
import { SeguimientoKpisTiService } from './seguimiento-kpis-ti.service';

function makeKpiDto(overrides: Partial<SeguimientoKpiDto> = {}): SeguimientoKpiDto {
  return {
    id: 10,
    codigo: 'KPI-TI-001',
    nombre: 'Disponibilidad de servicios',
    formula: 'Horas disponibles / Horas totales',
    unidad_medida: { nombre: 'Porcentaje', simbolo: '%' },
    frecuencia: { nombre: 'Semestral' },
    operador: '>=',
    ultimo_valor: {
      anio: 2026,
      periodo: { id: 2, codigo: 'S2', nombre: 'Semestre 2' },
      valor: 98,
      semaforo_color: 'VERDE',
    },
    avance_pct: 98,
    metas_anuales: [{ anio: 2026, meta: 100 }],
    serie: [
      {
        anio: 2026,
        periodo: { id: 1, codigo: 'S1', nombre: 'Semestre 1', numero: 1 },
        valor: null,
        meta: 100,
        semaforo_color: null,
      },
      {
        anio: 2026,
        periodo: { id: 2, codigo: 'S2', nombre: 'Semestre 2', numero: 2 },
        valor: 98,
        meta: 100,
        semaforo_color: 'VERDE',
      },
    ],
    ...overrides,
  };
}

function makeDto(): SeguimientoKpisDto {
  const cumplimiento = {
    porcentaje_promedio: 98,
    kpis_evaluados: 2,
    total_kpis: 2,
    kpis_verde: 2,
    kpis_amarillo: 0,
    kpis_rojo: 0,
    kpis_sin_dato: 0,
  };
  return {
    plan: { id: 5, codigo: 'PE-0005', nombre: 'Plan institucional' },
    cumplimiento_general: cumplimiento,
    perspectivas: [
      {
        id: 1,
        nombre: 'Financiera',
        cumplimiento,
        objetivos: [
          {
            id: 20,
            codigo: 'OE-TI-001',
            nombre: 'Asegurar continuidad de TI',
            responsable: 'Ana Torres',
            kpis: [makeKpiDto()],
          },
          {
            id: 21,
            codigo: 'OE-TI-002',
            nombre: 'Optimizar servicios de TI',
            responsable: 'Ana Torres',
            kpis: [makeKpiDto({ id: 11, codigo: 'KPI-TI-002', nombre: 'Eficiencia de servicios' })],
          },
        ],
      },
      {
        id: 2,
        nombre: 'Cliente',
        cumplimiento: {
          porcentaje_promedio: null,
          kpis_evaluados: 0,
          total_kpis: 0,
          kpis_verde: 0,
          kpis_amarillo: 0,
          kpis_rojo: 0,
          kpis_sin_dato: 0,
        },
        objetivos: [],
      },
    ],
  };
}

describe('SeguimientoKpisTiService', () => {
  let service: SeguimientoKpisTiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SeguimientoKpisTiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets and maps TI KPI tracking for a plan', () => {
    let result: SeguimientoKpis | undefined;
    service.obtener(5).subscribe((value) => (result = value));

    const req = httpMock.expectOne(
      `${environment.apiUrl}/planes-estrategicos/5/seguimiento-kpis-ti`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(makeDto());

    expect(result).toEqual({
      planId: 5,
      planNombre: 'Plan institucional',
      cumplimientoGeneral: {
        porcentaje: 98,
        evaluados: 2,
        total: 2,
        verde: 2,
        amarillo: 0,
        rojo: 0,
        sinDato: 0,
      },
      perspectivas: [
        {
          id: 1,
          nombre: 'Financiera',
          orden: 1,
          cumplimiento: {
            porcentaje: 98,
            evaluados: 2,
            total: 2,
            verde: 2,
            amarillo: 0,
            rojo: 0,
            sinDato: 0,
          },
          kpis: [
            expect.objectContaining({
              kpiId: 10,
              codigo: 'KPI-TI-001',
              nombre: 'Disponibilidad de servicios',
              frecuenciaNombre: 'Semestral',
              unidadSimbolo: '%',
              operador: '>=',
              avancePct: 98,
              ultimoValor: {
                anio: 2026,
                periodoCodigo: 'S2',
                periodoNombre: 'Semestre 2',
                valor: 98,
                color: 'VERDE',
              },
              metaUltimoAnio: 100,
              serie: [
                {
                  anio: 2026,
                  periodoCodigo: 'S1',
                  periodoNombre: 'Semestre 1',
                  valor: null,
                  meta: 100,
                  color: null,
                },
                {
                  anio: 2026,
                  periodoCodigo: 'S2',
                  periodoNombre: 'Semestre 2',
                  valor: 98,
                  meta: 100,
                  color: 'VERDE',
                },
              ],
            }),
            expect.objectContaining({
              kpiId: 11,
              codigo: 'KPI-TI-002',
              nombre: 'Eficiencia de servicios',
            }),
          ],
        },
        {
          id: 2,
          nombre: 'Cliente',
          orden: 2,
          cumplimiento: {
            porcentaje: null,
            evaluados: 0,
            total: 0,
            verde: 0,
            amarillo: 0,
            rojo: 0,
            sinDato: 0,
          },
          kpis: [],
        },
      ],
    });
  });

  it('ignores linked business objective fields without changing the mapped tracking', () => {
    const dto = makeDto();
    const objetivos = dto.perspectivas[0].objetivos;
    const objetivosTi = [
      {
        ...objetivos[0],
        oe_negocio_id: 100,
        oe_negocio: { id: 100, codigo: 'OE-NEG-001', nombre: 'Mejorar rentabilidad del negocio' },
      },
      { ...objetivos[1], oe_negocio_id: null, oe_negocio: null },
    ];
    dto.perspectivas[0].objetivos = objetivosTi;
    let baseline: SeguimientoKpis | undefined;
    let result: SeguimientoKpis | undefined;

    service.obtener(5).subscribe((value) => (baseline = value));
    httpMock
      .expectOne(`${environment.apiUrl}/planes-estrategicos/5/seguimiento-kpis-ti`)
      .flush(makeDto());
    service.obtener(5).subscribe((value) => (result = value));
    httpMock
      .expectOne(`${environment.apiUrl}/planes-estrategicos/5/seguimiento-kpis-ti`)
      .flush(dto);

    expect(result).toEqual(baseline);
    expect(result?.perspectivas[0].kpis).toHaveLength(2);
    expect(result?.perspectivas[0]).not.toHaveProperty('objetivos');
    for (const kpi of result!.perspectivas[0].kpis) {
      expect(kpi).not.toHaveProperty('oeNegocio');
      expect(kpi).not.toHaveProperty('oe_negocio');
    }
  });

  it('propagates HTTP errors', () => {
    let error: unknown;
    service.obtener(5).subscribe({ error: (response) => (error = response) });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/planes-estrategicos/5/seguimiento-kpis-ti`,
    );
    req.flush({ message: 'Error' }, { status: 500, statusText: 'Server Error' });

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(500);
  });
});
