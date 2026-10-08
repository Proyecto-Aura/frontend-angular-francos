import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PlanEstrategicoDto } from '../../interfaces/plan-estrategico-dto.interface';
import { PlanEstrategico } from '../../interfaces/plan-estrategico.interface';
import { PlanEstrategicoFormModal } from './plan-estrategico-form-modal';

const PLANES_BASE = `${environment.apiUrl}/planes-estrategicos`;

function makePlanDto(overrides: Partial<PlanEstrategicoDto> = {}): PlanEstrategicoDto {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan existente',
    descripcion: 'Descripción existente',
    anio_inicio: 2025,
    anio_fin: 2027,
    estado_plan_id: 1,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    estado_plan: { codigo: 'BORRADOR', nombre: 'Borrador' },
    ...overrides,
  };
}

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan existente',
    descripcion: 'Descripción existente',
    anioInicio: 2025,
    anioFin: 2027,
    estadoCodigo: 'BORRADOR',
    estadoNombre: 'Borrador',
    activo: true,
    ...overrides,
  };
}

describe('PlanEstrategicoFormModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function openModal(
    plan: PlanEstrategico | null = null,
    existingPlans: PlanEstrategicoDto[] = [],
  ): ComponentFixture<PlanEstrategicoFormModal> {
    const fixture = TestBed.createComponent(PlanEstrategicoFormModal);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (request) =>
        request.url === PLANES_BASE &&
        request.params.get('page') === '1' &&
        request.params.get('limit') === '100',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      data: existingPlans,
      meta: { total: existingPlans.length, page: 1, limit: 100, total_pages: 1 },
    });
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(fixture: ComponentFixture<PlanEstrategicoFormModal>): void {
    const component = fixture.componentInstance;
    component.nombre.set('Plan 2028 - 2030');
    component.descripcion.set('Descripción');
    component.anioInicio.set('2028');
    component.anioFin.set('2030');
    fixture.detectChanges();
  }

  it('loads all plans when opened and uses the create title', () => {
    const fixture = openModal();

    expect(fixture.componentInstance.titulo()).toBe('Nuevo plan estratégico');
  });

  it('does not POST an empty form and marks its required fields', () => {
    const fixture = openModal();

    fixture.componentInstance.guardar();

    httpMock.expectNone(PLANES_BASE);
    expect(fixture.componentInstance.errores()).toMatchObject({
      nombre: 'El nombre es obligatorio.',
      anioInicio: 'Requerido.',
      anioFin: 'Requerido.',
    });
  });

  it('registers a valid plan and emits saved and closed', () => {
    const fixture = openModal();
    fillValidForm(fixture);
    const saved: PlanEstrategico[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((plan) => saved.push(plan));
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(PLANES_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Plan 2028 - 2030',
      descripcion: 'Descripción',
      anio_inicio: 2028,
      anio_fin: 2030,
    });
    req.flush(
      makePlanDto({
        id: 8,
        codigo: 'PE-0008',
        nombre: 'Plan 2028 - 2030',
        anio_inicio: 2028,
        anio_fin: 2030,
      }),
    );

    expect(saved).toEqual([expect.objectContaining({ id: 8, codigo: 'PE-0008' })]);
    expect(closed).toBe(1);
  });

  it('puts a duplicate-name conflict on the name field', () => {
    const fixture = openModal();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    httpMock.expectOne(PLANES_BASE).flush(
      { statusCode: 409, message: 'Ya existe otro plan registrado con ese nombre' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(fixture.componentInstance.errores().nombre).toBe(
      'Ya existe un plan con este nombre.',
    );
  });

  it('puts a year conflict on the end-year field', () => {
    const fixture = openModal();
    fillValidForm(fixture);
    const message = 'El año de fin no puede ser anterior al año de inicio';

    fixture.componentInstance.guardar();
    httpMock.expectOne(PLANES_BASE).flush(
      { statusCode: 409, message },
      { status: 409, statusText: 'Conflict' },
    );

    expect(fixture.componentInstance.errores().anioFin).toBe(message);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = openModal();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    httpMock.expectOne(PLANES_BASE).flush(
      { statusCode: 403, message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para registrar planes estratégicos.',
    );
  });

  it('shows a generic error for an unexpected server response', () => {
    const fixture = openModal();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    httpMock.expectOne(PLANES_BASE).flush(
      { statusCode: 500, message: 'Error interno' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo guardar el plan. Intente nuevamente.',
    );
  });

  it('preloads edit values and PATCHes the selected plan', () => {
    const plan = makePlan();
    const fixture = openModal(plan, [makePlanDto()]);
    const component = fixture.componentInstance;

    expect(component.titulo()).toBe('Editar plan estratégico');
    expect(component.nombre()).toBe(plan.nombre);
    expect(component.descripcion()).toBe(plan.descripcion);
    expect(component.anioInicio()).toBe('2025');
    expect(component.anioFin()).toBe('2027');

    component.guardar();
    const req = httpMock.expectOne(`${PLANES_BASE}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      nombre: 'Plan existente',
      descripcion: 'Descripción existente',
      anio_inicio: 2025,
      anio_fin: 2027,
    });
    req.flush(makePlanDto());
  });

  it('offers start years from 2020 to 2059 and end years from 2021 to 2060', () => {
    const component = openModal().componentInstance;

    expect(component.opcionesAnioInicio[0].value).toBe('2020');
    expect(component.opcionesAnioInicio.at(-1)?.value).toBe('2059');
    expect(component.opcionesAnioFin()[0].value).toBe('2021');
    expect(component.opcionesAnioFin().at(-1)?.value).toBe('2060');
  });

  it('starts end-year options after the selected start year', () => {
    const fixture = openModal();
    fixture.componentInstance.anioInicio.set('2021');

    expect(fixture.componentInstance.opcionesAnioFin()[0].value).toBe('2022');
    expect(fixture.componentInstance.opcionesAnioFin().at(-1)?.value).toBe('2060');
  });

  it('clears an end year that becomes invalid after changing the start year', () => {
    const fixture = openModal();
    const component = fixture.componentInstance;
    component.anioFin.set('2025');
    component.anioInicio.set('2026');
    fixture.detectChanges();

    expect(component.anioFin()).toBe('');
  });

  it('detects overlap with an existing plan', () => {
    const fixture = openModal(null, [makePlanDto()]);
    const component = fixture.componentInstance;
    component.anioInicio.set('2024');
    component.anioFin.set('2026');

    expect(component.muestraSolapamiento()).toBe(true);
  });

  it('ignores the selected plan itself when checking overlap in edit mode', () => {
    const fixture = openModal(makePlan(), [makePlanDto()]);

    expect(fixture.componentInstance.muestraSolapamiento()).toBe(false);
  });
});
