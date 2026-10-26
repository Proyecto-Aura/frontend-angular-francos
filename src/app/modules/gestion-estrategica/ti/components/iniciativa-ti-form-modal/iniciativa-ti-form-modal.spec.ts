import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { Select } from '../../../../../shared/ds/select/select';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { Iniciativa } from '../../../negocio/interfaces/iniciativa.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { IniciativaTiService } from '../../services/iniciativa-ti.service';
import { IniciativaTiFormModal } from './iniciativa-ti-form-modal';

function makePlan(): PlanEstrategico {
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
  };
}

function makeObjetivoTi(overrides: Partial<ObjetivoEstrategicoTi> = {}): ObjetivoEstrategicoTi {
  return {
    id: 20,
    codigo: 'PE-0005-OE-TI-001',
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
    oeNegocioId: null,
    oeNegocio: null,
    ...overrides,
  };
}

function makeIniciativa(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
    id: 10,
    codigo: 'PE-0005-INI-TI-001',
    nombre: 'Programa de fidelización',
    descripcion: 'Alcance',
    responsable: 'Ana Torres',
    fechaInicio: '2026-01-15',
    fechaFin: '2027-12-20',
    presupuesto: 15000.5,
    motivoCancelacion: null,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    objetivoId: 20,
    objetivoNombre: 'Incrementar rentabilidad',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    ...overrides,
  };
}

function apiError(status: number, message: string | readonly string[]): HttpErrorResponse {
  return new HttpErrorResponse({
    error: { statusCode: status, message },
    status,
    statusText: 'Error',
  });
}

describe('IniciativaTiFormModal', () => {
  const iniciativaService = {
    crear: vi.fn(() => of(makeIniciativa())),
    actualizar: vi.fn(() => of(makeIniciativa())),
  };

  beforeEach(() => {
    iniciativaService.crear.mockReset();
    iniciativaService.crear.mockReturnValue(of(makeIniciativa()));
    iniciativaService.actualizar.mockReset();
    iniciativaService.actualizar.mockReturnValue(of(makeIniciativa()));
    TestBed.configureTestingModule({
      providers: [{ provide: IniciativaTiService, useValue: iniciativaService }],
    });
  });

  function create(
    iniciativa: Iniciativa | null = null,
    objetivos: ObjetivoEstrategicoTi[] = [
      makeObjetivoTi(),
      makeObjetivoTi({ id: 21, codigo: 'PE-0005-OE-TI-002', nombre: 'Mejorar ventas' }),
    ],
    objetivoIdInicial: number | null = null,
  ): ComponentFixture<IniciativaTiFormModal> {
    const fixture = TestBed.createComponent(IniciativaTiFormModal);
    fixture.componentRef.setInput('plan', makePlan());
    fixture.componentRef.setInput('objetivos', objetivos);
    fixture.componentRef.setInput('iniciativa', iniciativa);
    fixture.componentRef.setInput('objetivoIdInicial', objetivoIdInicial);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(component: IniciativaTiFormModal, presupuesto = ''): void {
    component.nombre.set('Programa de fidelización');
    component.descripcion.set('Alcance');
    component.objetivoId.set('20');
    component.responsable.set('Ana Torres');
    component.fechaInicio.set('2026-01-15');
    component.fechaFin.set('2027-12-20');
    component.presupuesto.set(presupuesto);
  }

  it('initializes creation with title, empty objective and dates, and pending initial state', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    expect(component.titulo()).toBe('Nueva iniciativa de TI');
    expect(component.objetivoId()).toBe('');
    expect(component.fechaInicio()).toBe('');
    expect(component.fechaFin()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Estado inicial');
    expect(fixture.nativeElement.textContent).toContain('Pendiente');
    expect(fixture.nativeElement.textContent).toContain('Objetivo estratégico de TI');
    expect(component.fechaMinima()).toBe('2026-01-01');
    expect(component.fechaMaxima()).toBe('2027-12-31');
  });

  it('preselects the initial objective on creation', () => {
    expect(create(null, [makeObjetivoTi()], 20).componentInstance.objetivoId()).toBe('20');
  });

  it('validates an empty form without calling the service', () => {
    const component = create().componentInstance;
    component.guardar();
    expect(iniciativaService.crear).not.toHaveBeenCalled();
    expect(component.errores()).toMatchObject({
      nombre: 'El nombre es obligatorio.',
      objetivoId: 'Requerido.',
      responsable: 'El responsable es obligatorio.',
      fechaInicio: 'La fecha de inicio es obligatoria.',
      fechaFin: 'La fecha de fin es obligatoria.',
    });
  });

  it.each([
    ['nombre', ' ', 'El nombre es obligatorio.'],
    ['nombre', 'a'.repeat(201), 'El nombre admite hasta 200 caracteres.'],
    ['objetivoId', '', 'Requerido.'],
    ['responsable', ' ', 'El responsable es obligatorio.'],
    ['responsable', 'a'.repeat(201), 'El responsable admite hasta 200 caracteres.'],
    ['fechaInicio', '', 'La fecha de inicio es obligatoria.'],
    ['fechaFin', '', 'La fecha de fin es obligatoria.'],
    ['fechaInicio', '2025-12-31', 'Fuera del rango del plan.'],
    ['fechaFin', '2028-01-01', 'Fuera del rango del plan.'],
    ['fechaFin', '2026-01-01', 'Debe ser posterior a la fecha de inicio.'],
    ['presupuesto', '-1', 'El presupuesto debe ser un número mayor o igual a 0.'],
    ['presupuesto', 'no-numero', 'El presupuesto debe ser un número mayor o igual a 0.'],
    ['presupuesto', '10.123', 'Máximo 10 enteros y 2 decimales.'],
    ['presupuesto', '10000000000', 'Máximo 10 enteros y 2 decimales.'],
  ] as const)('rejects invalid %s value %s without saving', (field, value, message) => {
    const fixture = create();
    const component = fixture.componentInstance;
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fillValidForm(component);
    component[field].set(value);
    component.guardar();
    fixture.detectChanges();
    expect(component.errores()[field]).toBe(message);
    expect(fixture.nativeElement.textContent).toContain(message);
    expect(iniciativaService.crear).not.toHaveBeenCalled();
    expect(iniciativaService.actualizar).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  });

  it.each([
    ['', null],
    ['15000.50', '15000.50'],
  ])('creates and emits saved and closed with budget %s', (presupuesto, expected) => {
    const fixture = create();
    const component = fixture.componentInstance;
    fillValidForm(component, presupuesto);
    const saved = vi.fn();
    const closed = vi.fn();
    component.saved.subscribe(saved);
    component.closed.subscribe(closed);
    component.guardar();

    expect(iniciativaService.crear).toHaveBeenCalledWith({
      nombre: 'Programa de fidelización',
      descripcion: 'Alcance',
      objetivoId: 20,
      responsable: 'Ana Torres',
      fechaInicio: '2026-01-15',
      fechaFin: '2027-12-20',
      presupuesto: expected ?? '',
    });
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));
    expect(closed).toHaveBeenCalledOnce();
  });

  it('preloads editing, enables objective selection and sends a changed objective', () => {
    const fixture = create(makeIniciativa());
    const component = fixture.componentInstance;
    expect(component.titulo()).toBe('Editar iniciativa de TI');
    expect(component.nombre()).toBe('Programa de fidelización');
    expect(component.descripcion()).toBe('Alcance');
    expect(component.objetivoId()).toBe('20');
    expect(component.responsable()).toBe('Ana Torres');
    expect(component.fechaInicio()).toBe('2026-01-15');
    expect(component.fechaFin()).toBe('2027-12-20');
    expect(component.presupuesto()).toBe('15000.5');
    const select = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    expect(select.disabled()).toBe(false);

    component.objetivoId.set('21');
    component.guardar();
    expect(iniciativaService.actualizar).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ objetivoId: 21 }),
    );
  });

  it('includes the current cancelled objective but excludes other cancelled objectives', () => {
    const objetivos = [
      makeObjetivoTi({ id: 20, estadoCodigo: 'CANCELADO', estadoNombre: 'Cancelado' }),
      makeObjetivoTi({ id: 21, estadoCodigo: 'CANCELADO', estadoNombre: 'Cancelado' }),
      makeObjetivoTi({ id: 22, estadoCodigo: 'PENDIENTE' }),
    ];
    const component = create(makeIniciativa(), objetivos).componentInstance;
    expect(component.opcionesObjetivo().map(({ value }) => value)).toEqual(['20', '22']);
  });

  it('reinitializes current values every time it opens', () => {
    const fixture = create(makeIniciativa());
    fixture.componentInstance.nombre.set('Cambio sin guardar');
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('iniciativa', makeIniciativa({ nombre: 'Valor actualizado' }));
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.nombre()).toBe('Valor actualizado');
  });

  it('places a duplicate-name conflict on the name field', () => {
    iniciativaService.crear.mockReturnValue(
      throwError(() => apiError(409, 'Ya existe una iniciativa con ese nombre')),
    );
    const component = create().componentInstance;
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fillValidForm(component);
    component.guardar();
    expect(component.errores().nombre).toBe(
      'Ya existe una iniciativa con este nombre en el objetivo.',
    );
    expect(closed).not.toHaveBeenCalled();
  });

  it.each([
    [409, 'Las fechas deben estar dentro del plan', 'Las fechas deben estar dentro del plan'],
    [404, 'Objetivo estratégico no encontrado', 'Objetivo estratégico no encontrado'],
    [
      400,
      ['fecha_inicio inválida', 'fecha_fin inválida'],
      'fecha_inicio inválida fecha_fin inválida',
    ],
    [403, 'Forbidden', 'No tiene permisos para gestionar iniciativas.'],
    [401, 'Unauthorized', 'No tiene permisos para gestionar iniciativas.'],
    [500, 'Error interno', 'No se pudo guardar la iniciativa. Intente nuevamente.'],
  ] as const)('handles backend status %s', (status, message, expected) => {
    iniciativaService.crear.mockReturnValue(throwError(() => apiError(status, message)));
    const component = create().componentInstance;
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fillValidForm(component);
    component.guardar();
    expect(component.errorGeneral()).toBe(expected);
    expect(component.guardando()).toBe(false);
    expect(closed).not.toHaveBeenCalled();
  });
});
