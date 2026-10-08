import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PlanEstrategico } from '../../interfaces/plan-estrategico.interface';
import { PlanEstrategicoEliminarModal } from './plan-estrategico-eliminar-modal';

const PLANES_BASE = `${environment.apiUrl}/planes-estrategicos`;

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 1,
    codigo: 'PE-0001',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2025,
    anioFin: 2027,
    estadoCodigo: 'BORRADOR',
    estadoNombre: 'Borrador',
    activo: true,
    ...overrides,
  };
}

describe('PlanEstrategicoEliminarModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(plan = makePlan()): ComponentFixture<PlanEstrategicoEliminarModal> {
    const fixture = TestBed.createComponent(PlanEstrategicoEliminarModal);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the selected plan name and code', () => {
    const fixture = create();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('«Plan institucional» (PE-0001)');
  });

  it('deletes the plan and emits deleted and closed', () => {
    const fixture = create();
    let deleted = 0;
    let closed = 0;
    fixture.componentInstance.deleted.subscribe(() => deleted++);
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.eliminar();

    const req = httpMock.expectOne(`${PLANES_BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(deleted).toBe(1);
    expect(closed).toBe(1);
  });

  it('shows the backend message for a conflict response', () => {
    const fixture = create();
    const message = 'Solo se puede eliminar un plan en estado Borrador';

    fixture.componentInstance.eliminar();
    httpMock.expectOne(`${PLANES_BASE}/1`).flush(
      { statusCode: 409, message },
      { status: 409, statusText: 'Conflict' },
    );

    expect(fixture.componentInstance.errorGeneral()).toBe(message);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = create();

    fixture.componentInstance.eliminar();
    httpMock.expectOne(`${PLANES_BASE}/1`).flush(
      { statusCode: 403, message: 'Forbidden' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para eliminar planes estratégicos.',
    );
  });

  it('shows a generic error for an unexpected response', () => {
    const fixture = create();

    fixture.componentInstance.eliminar();
    httpMock.expectOne(`${PLANES_BASE}/1`).flush(
      { statusCode: 500, message: 'Error interno' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo eliminar el plan. Intente nuevamente.',
    );
  });
});
