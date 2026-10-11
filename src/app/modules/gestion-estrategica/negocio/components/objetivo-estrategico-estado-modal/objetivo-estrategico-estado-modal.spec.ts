import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ObjetivoEstrategicoDto } from '../../interfaces/objetivo-estrategico-dto.interface';
import {
  EstadoObjetivoCodigo,
  ObjetivoEstrategico,
} from '../../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoEstadoModal } from './objetivo-estrategico-estado-modal';

const OBJETIVOS_BASE = `${environment.apiUrl}/objetivos-estrategicos`;

function makeObjetivo(
  estadoCodigo: EstadoObjetivoCodigo = 'PENDIENTE',
  overrides: Partial<ObjetivoEstrategico> = {},
): ObjetivoEstrategico {
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
    estadoCodigo,
    estadoNombre: estadoCodigo === 'PENDIENTE' ? 'Pendiente' : 'En proceso',
    relacionesDestinoIds: [],
    ...overrides,
  };
}

function makeObjetivoDto(estadoCodigo: EstadoObjetivoCodigo): ObjetivoEstrategicoDto {
  const estadoNombre =
    estadoCodigo === 'PENDIENTE'
      ? 'Pendiente'
      : estadoCodigo === 'EN_PROCESO'
        ? 'En proceso'
        : estadoCodigo === 'CUMPLIDO'
          ? 'Cumplido'
          : 'Cancelado';
  return {
    id: 1,
    codigo: 'OE-0001',
    plan_estrategico_id: 5,
    perspectiva_bsc_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Incrementar la rentabilidad',
    descripcion: null,
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    perspectiva_bsc: { id: 1, nombre: 'Financiera', descripcion: null, orden: 1 },
    estado_objetivo: { codigo: estadoCodigo, nombre: estadoNombre },
    relaciones_destino_ids: [],
  };
}

describe('ObjetivoEstrategicoEstadoModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(objetivo = makeObjetivo()): ComponentFixture<ObjetivoEstrategicoEstadoModal> {
    const fixture = TestBed.createComponent(ObjetivoEstrategicoEstadoModal);
    fixture.componentRef.setInput('objetivo', objetivo);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it('allows only backend transitions from pending and in-progress states', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    expect(component.puedeSeleccionar('EN_PROCESO')).toBe(true);
    expect(component.puedeSeleccionar('CANCELADO')).toBe(true);
    expect(component.puedeSeleccionar('CUMPLIDO')).toBe(false);

    fixture.componentRef.setInput('objetivo', makeObjetivo('EN_PROCESO'));
    fixture.detectChanges();
    expect(component.puedeSeleccionar('CUMPLIDO')).toBe(true);
    expect(component.puedeSeleccionar('CANCELADO')).toBe(true);
    expect(component.puedeSeleccionar('PENDIENTE')).toBe(false);
  });

  it('renders the current state as disabled', () => {
    const fixture = create();
    const currentButton = (
      Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
    ).find((button) => button.textContent?.includes('(actual)'));

    expect(currentButton?.disabled).toBe(true);
  });

  it('keeps save disabled until a valid transition is selected', () => {
    const fixture = create();
    const findSaveButton = () =>
      (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(
        (button) => button.textContent?.trim() === 'Guardar',
      );

    expect(fixture.componentInstance.puedeGuardar()).toBe(false);
    expect(findSaveButton()?.disabled).toBe(true);
    fixture.componentInstance.seleccionar('EN_PROCESO');
    fixture.detectChanges();
    expect(findSaveButton()?.disabled).toBe(false);
  });

  it('shows the final-state note for fulfilled and cancelled selections', () => {
    const fixture = create(makeObjetivo('EN_PROCESO'));

    fixture.componentInstance.seleccionar('CUMPLIDO');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Es un estado final');

    fixture.componentInstance.seleccionar('CANCELADO');
    expect(fixture.componentInstance.estadoFinalSeleccionado()).toBe(true);
  });

  it('changes state and emits saved and closed', () => {
    const fixture = create();
    const saved: ObjetivoEstrategico[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((objetivo) => saved.push(objetivo));
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentInstance.seleccionar('EN_PROCESO');

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/1/estado`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado_codigo: 'EN_PROCESO' });
    req.flush(makeObjetivoDto('EN_PROCESO'));
    expect(saved).toEqual([expect.objectContaining({ estadoCodigo: 'EN_PROCESO' })]);
    expect(closed).toBe(1);
  });

  it('shows the backend message for a conflict response', () => {
    const fixture = create();
    const message = 'Transición de estado no permitida';
    fixture.componentInstance.seleccionar('EN_PROCESO');

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(`${OBJETIVOS_BASE}/1/estado`)
      .flush({ statusCode: 409, message }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorGeneral()).toBe(message);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = create();
    fixture.componentInstance.seleccionar('EN_PROCESO');

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(`${OBJETIVOS_BASE}/1/estado`)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para cambiar el estado del objetivo.',
    );
  });
});
