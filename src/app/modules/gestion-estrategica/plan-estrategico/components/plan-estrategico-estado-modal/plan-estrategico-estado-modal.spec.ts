import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PlanEstrategicoDto } from '../../interfaces/plan-estrategico-dto.interface';
import {
  EstadoPlanCodigo,
  PlanEstrategico,
} from '../../interfaces/plan-estrategico.interface';
import { PlanEstrategicoEstadoModal } from './plan-estrategico-estado-modal';

const PLANES_BASE = `${environment.apiUrl}/planes-estrategicos`;

function makePlan(
  estadoCodigo: EstadoPlanCodigo = 'BORRADOR',
  overrides: Partial<PlanEstrategico> = {},
): PlanEstrategico {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2025,
    anioFin: 2027,
    estadoCodigo,
    estadoNombre:
      estadoCodigo === 'BORRADOR' ? 'Borrador' : estadoCodigo === 'ACTIVO' ? 'Activo' : 'Cerrado',
    activo: true,
    ...overrides,
  };
}

function makePlanDto(
  estadoCodigo: EstadoPlanCodigo,
  overrides: Partial<PlanEstrategicoDto> = {},
): PlanEstrategicoDto {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan institucional',
    descripcion: null,
    anio_inicio: 2025,
    anio_fin: 2027,
    estado_plan_id: estadoCodigo === 'BORRADOR' ? 1 : estadoCodigo === 'ACTIVO' ? 2 : 3,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    estado_plan: {
      codigo: estadoCodigo,
      nombre:
        estadoCodigo === 'BORRADOR'
          ? 'Borrador'
          : estadoCodigo === 'ACTIVO'
            ? 'Activo'
            : 'Cerrado',
    },
    ...overrides,
  };
}

describe('PlanEstrategicoEstadoModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(
    plan: PlanEstrategico,
    planActivo: PlanEstrategico | null = null,
  ): ComponentFixture<PlanEstrategicoEstadoModal> {
    const fixture = TestBed.createComponent(PlanEstrategicoEstadoModal);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('planActivo', planActivo);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it('computes the next state for draft, active, and closed plans', () => {
    const fixture = create(makePlan('BORRADOR'));

    expect(fixture.componentInstance.siguienteEstado()).toBe('ACTIVO');
    fixture.componentRef.setInput('plan', makePlan('ACTIVO'));
    fixture.detectChanges();
    expect(fixture.componentInstance.siguienteEstado()).toBe('CERRADO');
    fixture.componentRef.setInput('plan', makePlan('CERRADO'));
    fixture.detectChanges();
    expect(fixture.componentInstance.siguienteEstado()).toBeNull();
  });

  it('detects another active plan and does not send a request', () => {
    const fixture = create(makePlan('BORRADOR'), makePlan('ACTIVO', { id: 2, codigo: 'PE-0002' }));

    expect(fixture.componentInstance.tieneConflicto()).toBe(true);
    fixture.componentInstance.guardar();
    httpMock.expectNone(`${PLANES_BASE}/1/activar`);
  });

  it('activates a draft plan and emits saved and closed', () => {
    const fixture = create(makePlan('BORRADOR'));
    const saved: PlanEstrategico[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((plan) => saved.push(plan));
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${PLANES_BASE}/1/activar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(makePlanDto('ACTIVO'));
    expect(saved).toEqual([expect.objectContaining({ estadoCodigo: 'ACTIVO' })]);
    expect(closed).toBe(1);
  });

  it('disables closing until confirmed and then closes the plan', () => {
    const fixture = create(makePlan('ACTIVO'));
    const findCloseButton = () =>
      (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
        (button) => button.textContent?.includes('Cerrar plan'),
      );

    expect(findCloseButton()?.disabled).toBe(true);
    fixture.componentInstance.confirmacionCierre.set(true);
    fixture.detectChanges();
    expect(findCloseButton()?.disabled).toBe(false);

    fixture.componentInstance.guardar();
    const req = httpMock.expectOne(`${PLANES_BASE}/1/cerrar`);
    expect(req.request.method).toBe('PATCH');
    req.flush(makePlanDto('CERRADO'));
  });

  it('shows the backend message for a conflict response', () => {
    const fixture = create(makePlan('BORRADOR'));
    const message = 'Ya existe un plan activo';

    fixture.componentInstance.guardar();
    httpMock.expectOne(`${PLANES_BASE}/1/activar`).flush(
      { statusCode: 409, message },
      { status: 409, statusText: 'Conflict' },
    );

    expect(fixture.componentInstance.errorGeneral()).toBe(message);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = create(makePlan('BORRADOR'));

    fixture.componentInstance.guardar();
    httpMock.expectOne(`${PLANES_BASE}/1/activar`).flush(
      { statusCode: 403, message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para cambiar el estado del plan.',
    );
  });
});
