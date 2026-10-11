import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ObjetivoEstrategicoDto } from '../../interfaces/objetivo-estrategico-dto.interface';
import {
  ObjetivoEstrategico,
  PerspectivaBsc,
} from '../../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoFormModal } from './objetivo-estrategico-form-modal';

const OBJETIVOS_BASE = `${environment.apiUrl}/objetivos-estrategicos`;
const PERSPECTIVAS: PerspectivaBsc[] = [
  { id: 1, nombre: 'Financiera', orden: 1 },
  { id: 2, nombre: 'Clientes', orden: 2 },
  { id: 3, nombre: 'Aprendizaje y crecimiento', orden: 4 },
];

function makeObjetivo(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 1,
    codigo: 'OE-0001',
    planId: 5,
    nombre: 'Incrementar la rentabilidad',
    descripcion: 'Descripción existente',
    responsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [2],
    ...overrides,
  };
}

function makeObjetivoDto(overrides: Partial<ObjetivoEstrategicoDto> = {}): ObjetivoEstrategicoDto {
  return {
    id: 1,
    codigo: 'OE-0001',
    plan_estrategico_id: 5,
    perspectiva_bsc_id: 1,
    responsable: 'Ana Torres',
    nombre: 'Incrementar la rentabilidad',
    descripcion: 'Descripción existente',
    estado: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    perspectiva_bsc: { id: 1, nombre: 'Financiera', descripcion: null, orden: 1 },
    estado_objetivo: { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    relaciones_destino_ids: [2],
    ...overrides,
  };
}

describe('ObjetivoEstrategicoFormModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(
    objetivo: ObjetivoEstrategico | null = null,
    objetivosDelPlan: ObjetivoEstrategico[] = [],
    perspectivaInicialId: number | null = null,
  ): ComponentFixture<ObjetivoEstrategicoFormModal> {
    const fixture = TestBed.createComponent(ObjetivoEstrategicoFormModal);
    fixture.componentRef.setInput('planId', 5);
    fixture.componentRef.setInput('planNombre', 'Plan institucional');
    fixture.componentRef.setInput('objetivo', objetivo);
    fixture.componentRef.setInput('perspectivas', PERSPECTIVAS);
    fixture.componentRef.setInput('objetivosDelPlan', objetivosDelPlan);
    fixture.componentRef.setInput('perspectivaInicialId', perspectivaInicialId);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(fixture: ComponentFixture<ObjetivoEstrategicoFormModal>): void {
    const component = fixture.componentInstance;
    component.nombre.set('Incrementar la rentabilidad');
    component.descripcion.set('Descripción');
    component.responsable.set('Ana Torres');
    component.perspectivaId.set(1);
  }

  it('does not POST an empty form and marks required fields', () => {
    const fixture = create();

    fixture.componentInstance.guardar();

    httpMock.expectNone(OBJETIVOS_BASE);
    expect(fixture.componentInstance.errores()).toMatchObject({
      nombre: 'El nombre es obligatorio.',
      responsable: 'El responsable es obligatorio.',
      perspectivaId: 'Selecciona una perspectiva.',
    });
  });

  it('preselects the initial perspective when creating an objective', () => {
    const fixture = create(null, [], 2);

    expect(fixture.componentInstance.perspectivaId()).toBe(2);
  });

  it('registers a valid objective and emits saved and closed', () => {
    const fixture = create();
    fillValidForm(fixture);
    const saved: ObjetivoEstrategico[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((objetivo) => saved.push(objetivo));
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.guardar();

    const req = httpMock.expectOne(OBJETIVOS_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      plan_estrategico_id: 5,
      perspectiva_bsc_id: 1,
      nombre: 'Incrementar la rentabilidad',
      descripcion: 'Descripción',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [],
    });
    req.flush(makeObjetivoDto());
    expect(saved).toEqual([expect.objectContaining({ id: 1, codigo: 'OE-0001' })]);
    expect(closed).toBe(1);
  });

  it('preloads edit values and PATCHes the complete relationship set', () => {
    const objetivo = makeObjetivo();
    const fixture = create(objetivo, [objetivo, makeObjetivo({ id: 2 }), makeObjetivo({ id: 3 })]);
    const component = fixture.componentInstance;

    expect(component.nombre()).toBe(objetivo.nombre);
    expect(component.descripcion()).toBe(objetivo.descripcion);
    expect(component.responsable()).toBe(objetivo.responsable);
    expect(component.perspectivaId()).toBe(1);
    expect(component.estaRelacionada(2)).toBe(true);

    component.descripcion.set('   ');
    component.cambiarRelacion(2, false);
    component.cambiarRelacion(3, true);
    component.guardar();

    const req = httpMock.expectOne(`${OBJETIVOS_BASE}/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      perspectiva_bsc_id: 1,
      nombre: 'Incrementar la rentabilidad',
      descripcion: '',
      responsable: 'Ana Torres',
      relaciones_destino_ids: [3],
    });
    req.flush(makeObjetivoDto({ descripcion: '', relaciones_destino_ids: [3] }));
  });

  it('excludes the edited objective from relationship options', () => {
    const objetivo = makeObjetivo();
    const fixture = create(objetivo, [objetivo, makeObjetivo({ id: 2 })]);

    expect(fixture.componentInstance.objetivosRelacionables().map(({ id }) => id)).toEqual([2]);
  });

  it('adds and removes relationships without duplicates', () => {
    const component = create().componentInstance;

    component.cambiarRelacion(2, true);
    component.cambiarRelacion(2, true);
    expect(component.relacionesDestinoIds()).toEqual([2]);
    component.cambiarRelacion(2, false);
    expect(component.relacionesDestinoIds()).toEqual([]);
  });

  it('filters relationships by name and perspective without case or accent differences', () => {
    const fixture = create(null, [
      makeObjetivo({ id: 2, nombre: 'Más ingresos' }),
      makeObjetivo({
        id: 3,
        nombre: 'Mejorar satisfacción',
        perspectivaId: 2,
        perspectivaNombre: 'Clientes',
        perspectivaOrden: 2,
      }),
    ]);
    const component = fixture.componentInstance;

    component.busquedaRelacion.set('MAS INGRESOS');
    expect(component.objetivosRelacionablesFiltrados().map(({ id }) => id)).toEqual([2]);
    component.busquedaRelacion.set('clÍEntes');
    expect(component.objetivosRelacionablesFiltrados().map(({ id }) => id)).toEqual([3]);
  });

  it('marks a relationship search with no matches', () => {
    const component = create(null, [makeObjetivo({ id: 2 })]).componentInstance;

    component.busquedaRelacion.set('sin coincidencias');

    expect(component.objetivosRelacionablesFiltrados()).toEqual([]);
    expect(component.sinResultadosRelacion()).toBe(true);
  });

  it('clears the relationship search when reopened', () => {
    const fixture = create(null, [makeObjetivo({ id: 2 })]);
    fixture.componentInstance.busquedaRelacion.set('rentabilidad');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.componentInstance.busquedaRelacion()).toBe('');
  });

  it('puts a duplicate-name conflict on the name field', () => {
    const fixture = create();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(OBJETIVOS_BASE)
      .flush(
        { statusCode: 409, message: 'Ya existe un objetivo con ese nombre' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(fixture.componentInstance.errores().nombre).toBe(
      'Ya existe un objetivo con este nombre en el plan.',
    );
  });

  it('puts a cycle conflict on the relationship field', () => {
    const fixture = create();
    fillValidForm(fixture);
    const message = 'La relación genera un ciclo';

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(OBJETIVOS_BASE)
      .flush({ statusCode: 409, message }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorRelaciones()).toBe(message);
  });

  it('shows a draft conflict as a general error', () => {
    const fixture = create();
    fillValidForm(fixture);
    const message = 'El plan debe estar en estado Borrador';

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(OBJETIVOS_BASE)
      .flush({ statusCode: 409, message }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorGeneral()).toBe(message);
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = create();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(OBJETIVOS_BASE)
      .flush({ statusCode: 403, message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para gestionar objetivos estratégicos.',
    );
  });

  it('shows a generic error for an unexpected server response', () => {
    const fixture = create();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    httpMock
      .expectOne(OBJETIVOS_BASE)
      .flush(
        { statusCode: 500, message: 'Error interno' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo guardar el objetivo. Intente nuevamente.',
    );
  });
});
