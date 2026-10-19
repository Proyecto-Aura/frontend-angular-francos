import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoEliminarModal } from './objetivo-estrategico-eliminar-modal';

const OBJETIVOS_BASE = `${environment.apiUrl}/objetivos-estrategicos`;

function makeObjetivo(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 1,
    codigo: 'OE-0001',
    planId: 5,
    nombre: 'Incrementar la rentabilidad',
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

describe('ObjetivoEstrategicoEliminarModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(
    objetivo = makeObjetivo(),
    objetivosDelPlan: ObjetivoEstrategico[] = [objetivo],
  ): ComponentFixture<ObjetivoEstrategicoEliminarModal> {
    const fixture = TestBed.createComponent(ObjetivoEstrategicoEliminarModal);
    fixture.componentRef.setInput('objetivo', objetivo);
    fixture.componentRef.setInput('objetivosDelPlan', objetivosDelPlan);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it('shows confirmation and deletes an objective without relationships', () => {
    const fixture = create();
    let deleted = 0;
    let closed = 0;
    fixture.componentInstance.deleted.subscribe(() => deleted++);
    fixture.componentInstance.closed.subscribe(() => closed++);

    expect(fixture.nativeElement.textContent).toContain('«Incrementar la rentabilidad» (OE-0001)');
    fixture.componentInstance.eliminar();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(deleted).toBe(1);
    expect(closed).toBe(1);
  });

  it('shows incoming and outgoing relationships with only an acknowledgement action', () => {
    const objetivo = makeObjetivo({ relacionesDestinoIds: [2] });
    const fixture = create(objetivo, [
      objetivo,
      makeObjetivo({ id: 2, codigo: 'OE-0002', nombre: 'Objetivo destino' }),
      makeObjetivo({
        id: 3,
        codigo: 'OE-0003',
        nombre: 'Objetivo origen',
        relacionesDestinoIds: [1],
      }),
    ]);
    const actionTexts = Array.from(
      fixture.nativeElement.querySelectorAll('app-ds-button'),
      (button: Element) => button.textContent?.trim(),
    );

    expect(fixture.nativeElement.textContent).toContain('Influye en: OE-0002 · Objetivo destino');
    expect(fixture.nativeElement.textContent).toContain(
      'Recibe influencia de: OE-0003 · Objetivo origen',
    );
    expect(actionTexts).toEqual(['Entendido']);
    fixture.componentInstance.eliminar();
    httpMock.expectNone(`${OBJETIVOS_BASE}/1`);
  });

  it('shows the backend message for a conflict response', () => {
    const fixture = create();
    const message = 'El objetivo tiene relaciones';

    fixture.componentInstance.eliminar();
    httpMock
      .expectOne(`${OBJETIVOS_BASE}/1`)
      .flush({ statusCode: 409, message }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorGeneral()).toBe(message);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = create();

    fixture.componentInstance.eliminar();
    httpMock
      .expectOne(`${OBJETIVOS_BASE}/1`)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para eliminar objetivos estratégicos.',
    );
  });

  it('shows a generic error for an unexpected response', () => {
    const fixture = create();

    fixture.componentInstance.eliminar();
    httpMock
      .expectOne(`${OBJETIVOS_BASE}/1`)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo eliminar el objetivo. Intente nuevamente.',
    );
  });
});
