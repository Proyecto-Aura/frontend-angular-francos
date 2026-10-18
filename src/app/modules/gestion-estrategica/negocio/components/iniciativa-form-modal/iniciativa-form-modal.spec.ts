import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { Select } from '../../../../../shared/ds/select/select';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { Iniciativa } from '../../interfaces/iniciativa.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { IniciativaService } from '../../services/iniciativa.service';
import { IniciativaFormModal } from './iniciativa-form-modal';

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

function makeIniciativa(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
    id: 10,
    codigo: 'INI-001',
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

describe('IniciativaFormModal', () => {
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
      providers: [{ provide: IniciativaService, useValue: iniciativaService }],
    });
  });

  function create(
    iniciativa: Iniciativa | null = null,
    objetivos: ObjetivoEstrategico[] = [
      makeObjetivo(),
      makeObjetivo({ id: 21, codigo: 'OE-0021', nombre: 'Mejorar ventas' }),
    ],
    objetivoIdInicial: number | null = null,
  ): ComponentFixture<IniciativaFormModal> {
    const fixture = TestBed.createComponent(IniciativaFormModal);
    fixture.componentRef.setInput('plan', makePlan());
    fixture.componentRef.setInput('objetivos', objetivos);
    fixture.componentRef.setInput('iniciativa', iniciativa);
    fixture.componentRef.setInput('objetivoIdInicial', objetivoIdInicial);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(component: IniciativaFormModal, presupuesto = ''): void {
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
    expect(component.titulo()).toBe('Nueva iniciativa');
    expect(component.objetivoId()).toBe('');
    expect(component.fechaInicio()).toBe('');
    expect(component.fechaFin()).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Estado inicial');
    expect(fixture.nativeElement.textContent).toContain('Pendiente');
  });

  it('preselects the initial objective on creation', () => {
    expect(create(null, [makeObjetivo()], 20).componentInstance.objetivoId()).toBe('20');
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

    expect(iniciativaService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ presupuesto: expected ?? '' }),
    );
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));
    expect(closed).toHaveBeenCalledOnce();
  });

  it('preloads editing, enables objective selection and sends a changed objective', () => {
    const fixture = create(makeIniciativa());
    const component = fixture.componentInstance;
    expect(component.titulo()).toBe('Editar iniciativa');
    expect(component.nombre()).toBe('Programa de fidelización');
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
      makeObjetivo({ id: 20, estadoCodigo: 'CANCELADO', estadoNombre: 'Cancelado' }),
      makeObjetivo({ id: 21, estadoCodigo: 'CANCELADO', estadoNombre: 'Cancelado' }),
      makeObjetivo({ id: 22, estadoCodigo: 'PENDIENTE' }),
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
    fillValidForm(component);
    component.guardar();
    expect(component.errores().nombre).toBe(
      'Ya existe una iniciativa con este nombre en el objetivo.',
    );
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
    fillValidForm(component);
    component.guardar();
    expect(component.errorGeneral()).toBe(expected);
  });
});
