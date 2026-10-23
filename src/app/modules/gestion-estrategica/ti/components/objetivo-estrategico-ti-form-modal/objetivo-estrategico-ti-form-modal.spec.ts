import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ObjetivoEstrategico } from '../../../negocio/interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';
import { ObjetivoEstrategicoTiFormModal } from './objetivo-estrategico-ti-form-modal';

const PERSPECTIVAS = [
  { id: 1, nombre: 'Financiera', orden: 1 },
  { id: 2, nombre: 'Clientes', orden: 2 },
  { id: 3, nombre: 'Aprendizaje y crecimiento', orden: 4 },
];

function makeObjetivoTi(overrides: Partial<ObjetivoEstrategicoTi> = {}): ObjetivoEstrategicoTi {
  return {
    id: 1,
    codigo: 'OETI-0001',
    planId: 5,
    nombre: 'Modernizar la infraestructura',
    descripcion: 'Descripción existente',
    responsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [2],
    oeNegocioId: 100,
    oeNegocio: { id: 100, codigo: 'OE-0100', nombre: 'Incrementar la rentabilidad' },
    ...overrides,
  };
}

function makeObjetivoNegocio(overrides: Partial<ObjetivoEstrategico> = {}): ObjetivoEstrategico {
  return {
    id: 100,
    codigo: 'OE-0100',
    planId: 5,
    nombre: 'Incrementar la rentabilidad',
    descripcion: null,
    responsable: 'Gerencia General',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [],
    ...overrides,
  };
}

function httpError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    error: { statusCode: status, message },
    status,
    statusText: 'Error',
  });
}

describe('ObjetivoEstrategicoTiFormModal', () => {
  let objetivoService: {
    registrar: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    objetivoService = {
      registrar: vi.fn(() => of(makeObjetivoTi())),
      actualizar: vi.fn(() => of(makeObjetivoTi())),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ObjetivoEstrategicoTiService, useValue: objetivoService }],
    });
  });

  function create(
    objetivo: ObjetivoEstrategicoTi | null = null,
    objetivosDelPlan: ObjetivoEstrategicoTi[] = [],
    objetivosNegocio: ObjetivoEstrategico[] = [makeObjetivoNegocio()],
    perspectivaInicialId: number | null = null,
  ): ComponentFixture<ObjetivoEstrategicoTiFormModal> {
    const fixture = TestBed.createComponent(ObjetivoEstrategicoTiFormModal);
    fixture.componentRef.setInput('planId', 5);
    fixture.componentRef.setInput('planNombre', 'Plan institucional');
    fixture.componentRef.setInput('objetivo', objetivo);
    fixture.componentRef.setInput('perspectivas', PERSPECTIVAS);
    fixture.componentRef.setInput('objetivosDelPlan', objetivosDelPlan);
    fixture.componentRef.setInput('objetivosNegocio', objetivosNegocio);
    fixture.componentRef.setInput('perspectivaInicialId', perspectivaInicialId);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(fixture: ComponentFixture<ObjetivoEstrategicoTiFormModal>): void {
    const component = fixture.componentInstance;
    component.nombre.set('Modernizar la infraestructura');
    component.descripcion.set('Descripción');
    component.responsable.set('Ana Torres');
    component.perspectivaId.set(1);
    component.oeNegocioIdTexto.set('100');
  }

  it('does not register an empty form and marks all required fields', () => {
    const fixture = create();

    fixture.componentInstance.guardar();

    expect(objetivoService.registrar).not.toHaveBeenCalled();
    expect(fixture.componentInstance.errores()).toEqual({
      nombre: 'El nombre es obligatorio.',
      responsable: 'El responsable es obligatorio.',
      perspectivaId: 'Selecciona una perspectiva.',
      oeNegocioId: 'Selecciona un objetivo de negocio.',
    });
  });

  it('renders create mode and preselects the initial perspective', () => {
    const fixture = create(null, [], [makeObjetivoNegocio()], 2);

    expect(fixture.componentInstance.titulo()).toBe('Nuevo objetivo estratégico de TI');
    expect(fixture.componentInstance.perspectivaId()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Crear objetivo');
  });

  it('registers a valid objective and emits saved and closed', () => {
    const fixture = create();
    fillValidForm(fixture);
    const saved: ObjetivoEstrategicoTi[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((objetivo) => saved.push(objetivo));
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.guardar();

    expect(objetivoService.registrar).toHaveBeenCalledWith(5, {
      nombre: 'Modernizar la infraestructura',
      descripcion: 'Descripción',
      responsable: 'Ana Torres',
      perspectivaId: 1,
      relacionesDestinoIds: [],
      oeNegocioId: 100,
    });
    expect(saved).toEqual([expect.objectContaining({ id: 1, codigo: 'OETI-0001' })]);
    expect(closed).toBe(1);
  });

  it('renders edit mode and preloads all objective values', () => {
    const objetivo = makeObjetivoTi();
    const fixture = create(objetivo, [objetivo, makeObjetivoTi({ id: 2 })]);
    const component = fixture.componentInstance;

    expect(component.titulo()).toBe('Editar objetivo estratégico de TI');
    expect(component.nombre()).toBe(objetivo.nombre);
    expect(component.descripcion()).toBe(objetivo.descripcion);
    expect(component.responsable()).toBe(objetivo.responsable);
    expect(component.perspectivaId()).toBe(1);
    expect(component.oeNegocioIdTexto()).toBe('100');
    expect(component.relacionesDestinoIds()).toEqual([2]);
    expect(fixture.nativeElement.textContent).toContain('Guardar cambios');
    const codeInput = fixture.nativeElement.querySelector(
      '#objetivo-estrategico-ti-codigo',
    ) as HTMLInputElement;
    expect(codeInput.disabled).toBe(true);
  });

  it('updates with the complete relationship set and keeps an emptied description', () => {
    const objetivo = makeObjetivoTi();
    const fixture = create(objetivo, [
      objetivo,
      makeObjetivoTi({ id: 2 }),
      makeObjetivoTi({ id: 3 }),
    ]);
    const component = fixture.componentInstance;
    component.descripcion.set('');
    component.cambiarRelacion(2, false);
    component.cambiarRelacion(3, true);

    component.guardar();

    expect(objetivoService.actualizar).toHaveBeenCalledWith(1, {
      nombre: 'Modernizar la infraestructura',
      descripcion: '',
      responsable: 'Ana Torres',
      perspectivaId: 1,
      relacionesDestinoIds: [3],
      oeNegocioId: 100,
    });
  });

  it('builds business objective options with text ids and formatted labels', () => {
    const fixture = create(
      null,
      [],
      [
        makeObjetivoNegocio(),
        makeObjetivoNegocio({ id: 101, codigo: 'OE-0101', nombre: 'Mejorar ventas' }),
      ],
    );

    expect(fixture.componentInstance.opcionesObjetivoNegocio()).toEqual([
      { value: '100', label: 'OE-0100 · Incrementar la rentabilidad' },
      { value: '101', label: 'OE-0101 · Mejorar ventas' },
    ]);
  });

  it('excludes cancelled business objectives except the one linked while editing', () => {
    const cancelado = makeObjetivoNegocio({
      estadoCodigo: 'CANCELADO',
      estadoNombre: 'Cancelado',
    });
    const otroCancelado = makeObjetivoNegocio({
      id: 101,
      estadoCodigo: 'CANCELADO',
      estadoNombre: 'Cancelado',
    });

    expect(
      create(null, [], [cancelado, otroCancelado]).componentInstance.opcionesObjetivoNegocio(),
    ).toEqual([]);
    expect(
      create(makeObjetivoTi(), [], [cancelado, otroCancelado])
        .componentInstance.opcionesObjetivoNegocio()
        .map(({ value }) => value),
    ).toEqual(['100']);
  });

  it('shows the default and selected business objective hints', () => {
    const component = create().componentInstance;

    expect(component.hintObjetivoNegocio()).toBe(
      'Alinea este objetivo de TI con la estrategia del negocio',
    );
    component.oeNegocioIdTexto.set('100');
    expect(component.hintObjetivoNegocio()).toBe('Perspectiva del objetivo de negocio: Financiera');
  });

  it('excludes the edited objective from relationship options', () => {
    const objetivo = makeObjetivoTi();
    const component = create(objetivo, [objetivo, makeObjetivoTi({ id: 2 })]).componentInstance;

    expect(component.objetivosRelacionables().map(({ id }) => id)).toEqual([2]);
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
      makeObjetivoTi({ id: 2, nombre: 'Más automatización' }),
      makeObjetivoTi({
        id: 3,
        nombre: 'Mejorar satisfacción',
        perspectivaId: 2,
        perspectivaNombre: 'Clientes',
        perspectivaOrden: 2,
      }),
    ]);
    const component = fixture.componentInstance;

    component.busquedaRelacion.set('MAS AUTOMATIZACION');
    expect(component.objetivosRelacionablesFiltrados().map(({ id }) => id)).toEqual([2]);
    component.busquedaRelacion.set('clÍEntes');
    expect(component.objetivosRelacionablesFiltrados().map(({ id }) => id)).toEqual([3]);
    component.busquedaRelacion.set('sin coincidencias');
    expect(component.sinResultadosRelacion()).toBe(true);
  });

  it('clears the relationship search when reopened', () => {
    const fixture = create(null, [makeObjetivoTi({ id: 2 })]);
    fixture.componentInstance.busquedaRelacion.set('infraestructura');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.componentInstance.busquedaRelacion()).toBe('');
  });

  it('shows the empty TI relationship message when there are no other objectives', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain(
      'No hay otros objetivos de TI en este plan. Crea más objetivos para vincularlos.',
    );
  });

  it('puts a duplicate-name conflict on the name field', () => {
    const fixture = create();
    fillValidForm(fixture);
    objetivoService.registrar.mockReturnValue(
      throwError(() => httpError(409, 'Ya existe un objetivo con ese nombre')),
    );

    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errores().nombre).toBe(
      'Ya existe un objetivo de TI con este nombre en el plan.',
    );
  });

  it.each([
    [409, 'La relación genera un ciclo'],
    [409, 'Ya existe la relación inversa'],
    [409, 'Un objetivo no puede relacionarse consigo mismo'],
    [404, 'Objetivo estratégico de destino no encontrado'],
  ])('puts a %s relationship error on the relationship field', (status, message) => {
    const fixture = create();
    fillValidForm(fixture);
    objetivoService.registrar.mockReturnValue(throwError(() => httpError(status, message)));

    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errorRelaciones()).toBe(message);
    expect(fixture.componentInstance.errores().oeNegocioId).toBeUndefined();
  });

  it.each([404, 409])('puts a %s business objective error on its field', (status) => {
    const fixture = create();
    fillValidForm(fixture);
    const message = 'Objetivo estratégico de Negocio no encontrado';
    objetivoService.registrar.mockReturnValue(throwError(() => httpError(status, message)));

    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errores().oeNegocioId).toBe(message);
    expect(fixture.componentInstance.errorRelaciones()).toBeNull();
  });

  it.each([
    [409, 'El plan debe estar en estado Borrador', 'El plan debe estar en estado Borrador'],
    [400, 'Datos inválidos', 'Datos inválidos'],
    [403, 'Forbidden', 'No tiene permisos para gestionar objetivos estratégicos de TI.'],
    [500, 'Error interno', 'No se pudo guardar el objetivo. Intente nuevamente.'],
  ])('shows the expected general error for status %s', (status, message, expected) => {
    const fixture = create();
    fillValidForm(fixture);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    objetivoService.registrar.mockReturnValue(throwError(() => httpError(status, message)));

    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errorGeneral()).toBe(expected);
    expect(fixture.componentInstance.guardando()).toBe(false);
    expect(closed).toBe(0);
  });

  it('resets values and errors when the modal is reopened', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.nombre.set('Valor temporal');
    component.busquedaRelacion.set('búsqueda');
    component.errores.set({ nombre: 'Error' });
    component.errorGeneral.set('Error general');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(component.nombre()).toBe('');
    expect(component.busquedaRelacion()).toBe('');
    expect(component.errores()).toEqual({});
    expect(component.errorGeneral()).toBeNull();
  });
});
