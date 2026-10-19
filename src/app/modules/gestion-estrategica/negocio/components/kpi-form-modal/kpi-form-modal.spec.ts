import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../../../environments/environment';
import { Select } from '../../../../../shared/ds/select/select';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { KpiDto } from '../../interfaces/kpi-dto.interface';
import { Kpi } from '../../interfaces/kpi.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { KpiFormModal } from './kpi-form-modal';

const KPI_BASE = `${environment.apiUrl}/kpis`;

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2026,
    anioFin: 2027,
    estadoCodigo: 'BORRADOR',
    estadoNombre: 'Borrador',
    activo: true,
    ...overrides,
  };
}

function makeObjetivo(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 20,
    codigo: 'OE-0020',
    planId: 5,
    nombre: 'Incrementar rentabilidad',
    descripcion: null,
    responsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [],
    ...overrides,
  };
}

function makeKpi(overrides: Partial<Kpi> = {}): Kpi {
  return {
    id: 10,
    codigo: 'KPI-001',
    nombre: 'Margen operativo',
    formula: 'Utilidad / Ventas',
    objetivoId: 20,
    objetivoNombre: 'Incrementar rentabilidad',
    objetivoResponsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    frecuenciaId: 2,
    frecuenciaNombre: 'Trimestral',
    unidadId: 3,
    unidadSimbolo: '%',
    metaFinal: 30,
    metas: [
      {
        anio: 2026,
        meta: 25,
        operador: '>=',
        valorAmarillo: 20,
        operadorAmarillo: '>=',
      },
      {
        anio: 2027,
        meta: 30,
        operador: '>=',
        valorAmarillo: 25,
        operadorAmarillo: '>=',
      },
    ],
    ultimoValor: null,
    ...overrides,
  };
}

function makeKpiDto(): KpiDto {
  return {
    id: 10,
    codigo: 'KPI-001',
    nombre: 'Margen operativo',
    formula: 'Utilidad / Ventas',
    estado: true,
    objetivo: {
      id: 20,
      nombre: 'Incrementar rentabilidad',
      perspectiva: { id: 1, nombre: 'Financiera' },
    },
    frecuencia: { id: 2, nombre: 'Trimestral' },
    unidad_medida: { id: 3, nombre: 'Porcentaje', simbolo: '%' },
    meta_final: 30,
    metas_por_anio: [],
  };
}

describe('KpiFormModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(
    plan = makePlan(),
    kpi: Kpi | null = null,
    objetivos: ObjetivoEstrategico[] = [
      makeObjetivo(),
      makeObjetivo({ id: 21, codigo: 'OE-0021' }),
    ],
  ): ComponentFixture<KpiFormModal> {
    const fixture = TestBed.createComponent(KpiFormModal);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('objetivos', objetivos);
    fixture.componentRef.setInput('kpi', kpi);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function flushCatalogs(): void {
    httpMock
      .expectOne(`${environment.apiUrl}/frecuencias-medicion`)
      .flush([{ id: 2, nombre: 'Trimestral', periodos_por_anio: 4, orden: 1 }]);
    httpMock
      .expectOne(`${environment.apiUrl}/unidades-medida-kpi`)
      .flush([{ id: 3, nombre: 'Porcentaje', simbolo: '%', decimales: 2 }]);
  }

  function fillValidForm(fixture: ComponentFixture<KpiFormModal>): void {
    const component = fixture.componentInstance;
    component.nombre.set('Margen operativo');
    component.formula.set('Utilidad / Ventas');
    component.objetivoId.set('20');
    component.frecuenciaId.set('2');
    component.unidadId.set('3');
    component.filas.set([
      { anio: 2026, meta: '25', operador: '>=', valorAmarillo: '20' },
      { anio: 2027, meta: '30', operador: '>=', valorAmarillo: '25' },
    ]);
  }

  it('initializes creation with its title, one row per plan year and >= operator', () => {
    const fixture = create();
    flushCatalogs();

    expect(fixture.componentInstance.titulo()).toBe('Nuevo KPI');
    expect(fixture.componentInstance.filas()).toEqual([
      { anio: 2026, meta: '', operador: '>=', valorAmarillo: '' },
      { anio: 2027, meta: '', operador: '>=', valorAmarillo: '' },
    ]);
  });

  it('marks required fields and does not call the KPI endpoint for an invalid form', () => {
    const fixture = create();
    flushCatalogs();

    fixture.componentInstance.guardar();

    httpMock.expectNone(KPI_BASE);
    expect(fixture.componentInstance.errores()).toMatchObject({
      nombre: 'El nombre es obligatorio.',
      formula: 'La fórmula es obligatoria.',
      objetivoId: 'Seleccione un objetivo estratégico.',
      frecuenciaId: 'Seleccione una frecuencia.',
      unidadId: 'Seleccione una unidad de medida.',
    });
    expect(fixture.componentInstance.erroresDeAnio(2026)).not.toHaveLength(0);
  });

  it('creates a valid KPI and emits saved and closed with the expected request', () => {
    const fixture = create();
    flushCatalogs();
    fillValidForm(fixture);
    const saved: Kpi[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((kpi) => saved.push(kpi));
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(KPI_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      objetivo_estrategico_id: 20,
      nombre: 'Margen operativo',
      formula: 'Utilidad / Ventas',
      frecuencia_id: 2,
      unidad_medida_id: 3,
      metas_por_anio: [
        {
          anio: 2026,
          meta: 25,
          operador_verde: '>=',
          operador_amarillo: '>=',
          valor_amarillo: 20,
        },
        {
          anio: 2027,
          meta: 30,
          operador_verde: '>=',
          operador_amarillo: '>=',
          valor_amarillo: 25,
        },
      ],
    });
    req.flush(makeKpiDto());
    expect(saved).toEqual([expect.objectContaining({ id: 10 })]);
    expect(closed).toBe(1);
  });

  it('preloads draft editing, keeps objective enabled and updates its changed objective', () => {
    const fixture = create(makePlan(), makeKpi());
    flushCatalogs();
    const component = fixture.componentInstance;

    expect(component.titulo()).toBe('Editar KPI');
    expect(component.nombre()).toBe('Margen operativo');
    const objetivoSelect = fixture.debugElement
      .queryAll(By.directive(Select))
      .map((debug) => debug.componentInstance as Select)
      .find((select) => select.id() === 'kpi-objetivo');
    expect(objetivoSelect?.disabled()).toBe(false);

    component.objetivoId.set('21');
    component.guardar();

    const req = httpMock.expectOne(`${KPI_BASE}/10`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.objetivo_estrategico_id).toBe(21);
    expect(req.request.body.metas_por_anio).toHaveLength(2);
    req.flush(makeKpiDto());
  });

  it('uses every current plan year, inherits <= for a new year and drops old out-of-plan years', () => {
    const kpi = makeKpi({
      metas: [
        {
          anio: 2025,
          meta: 5,
          operador: '<=',
          valorAmarillo: 8,
          operadorAmarillo: '<=',
        },
        {
          anio: 2026,
          meta: 10,
          operador: '<=',
          valorAmarillo: 12,
          operadorAmarillo: '<=',
        },
      ],
    });
    const fixture = create(makePlan({ anioInicio: 2026, anioFin: 2027 }), kpi);
    flushCatalogs();

    expect(fixture.componentInstance.filas()).toEqual([
      { anio: 2026, meta: '10', operador: '<=', valorAmarillo: '12' },
      { anio: 2027, meta: '', operador: '<=', valorAmarillo: '' },
    ]);
  });

  it.each([
    ['ACTIVO', 'Activo'],
    ['CERRADO', 'Cerrado'],
  ] as const)(
    'opens %s plans in read-only mode without a save button',
    (estadoCodigo, estadoNombre) => {
      const fixture = create(makePlan({ estadoCodigo, estadoNombre }), makeKpi());
      flushCatalogs();
      fixture.detectChanges();

      expect(fixture.componentInstance.titulo()).toBe('Ver KPI');
      expect(fixture.componentInstance.modoSoloLectura()).toBe(true);
      const actions = Array.from(
        fixture.nativeElement.querySelectorAll('app-ds-button'),
        (button: Element) => button.textContent?.trim(),
      );
      expect(actions).toEqual(['Cerrar']);
    },
  );

  it('puts a duplicate-name conflict on the name field', () => {
    const fixture = create();
    flushCatalogs();
    fillValidForm(fixture);
    fixture.componentInstance.guardar();
    httpMock
      .expectOne(KPI_BASE)
      .flush(
        { statusCode: 409, message: 'Ya existe un KPI registrado con ese nombre' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(fixture.componentInstance.errores().nombre).toBe(
      'Ya existe un KPI con este nombre en el objetivo.',
    );
  });

  it('shows a plan or traffic-light conflict as a general error', () => {
    const fixture = create();
    flushCatalogs();
    fillValidForm(fixture);
    const message = 'El Amarillo no puede ser más exigente que el Verde';
    fixture.componentInstance.guardar();
    httpMock
      .expectOne(KPI_BASE)
      .flush({ statusCode: 409, message }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorGeneral()).toBe(message);
  });

  it.each([401, 403])('shows a permission error for status %s', (status) => {
    const fixture = create();
    flushCatalogs();
    fillValidForm(fixture);
    fixture.componentInstance.guardar();
    httpMock
      .expectOne(KPI_BASE)
      .flush({ statusCode: status, message: 'Forbidden' }, { status, statusText: 'Forbidden' });

    expect(fixture.componentInstance.errorGeneral()).toBe('No tiene permisos para gestionar KPIs.');
  });

  it('shows a generic error for an unexpected response', () => {
    const fixture = create();
    flushCatalogs();
    fillValidForm(fixture);
    fixture.componentInstance.guardar();
    httpMock
      .expectOne(KPI_BASE)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo guardar el KPI. Intente nuevamente.',
    );
  });
});
