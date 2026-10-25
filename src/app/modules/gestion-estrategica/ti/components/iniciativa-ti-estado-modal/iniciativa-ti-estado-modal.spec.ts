import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Iniciativa } from '../../../negocio/interfaces/iniciativa.interface';
import { IniciativaTiService } from '../../services/iniciativa-ti.service';
import { IniciativaTiEstadoModal } from './iniciativa-ti-estado-modal';

function makeIniciativa(overrides: Partial<Iniciativa> = {}): Iniciativa {
  return {
    id: 10,
    codigo: 'PE-0005-INI-TI-001',
    nombre: 'Programa de fidelización',
    descripcion: null,
    responsable: 'Ana Torres',
    fechaInicio: '2026-01-15',
    fechaFin: '2027-12-20',
    presupuesto: null,
    motivoCancelacion: null,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    objetivoId: 20,
    objetivoNombre: 'Rentabilidad',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    ...overrides,
  };
}

function apiError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    error: { statusCode: status, message },
    status,
    statusText: 'Error',
  });
}

describe('IniciativaTiEstadoModal', () => {
  const iniciativaService = { cambiarEstado: vi.fn(() => of(makeIniciativa())) };

  beforeEach(() => {
    iniciativaService.cambiarEstado.mockReset();
    iniciativaService.cambiarEstado.mockReturnValue(of(makeIniciativa()));
    TestBed.configureTestingModule({
      providers: [{ provide: IniciativaTiService, useValue: iniciativaService }],
    });
  });

  function create(iniciativa = makeIniciativa()): ComponentFixture<IniciativaTiEstadoModal> {
    const fixture = TestBed.createComponent(IniciativaTiEstadoModal);
    fixture.componentRef.setInput('iniciativa', iniciativa);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the current and next state', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Pendiente');
    expect(fixture.nativeElement.textContent).toContain('En proceso');
  });

  it('shows the final-state warning only when moving to completed', () => {
    expect(create().nativeElement.textContent).not.toContain('Una vez completada');
    expect(
      create(makeIniciativa({ estadoCodigo: 'EN_PROCESO', estadoNombre: 'En proceso' }))
        .nativeElement.textContent,
    ).toContain('Una vez completada');
  });

  it('changes to the next state and emits changed and closed', () => {
    const component = create().componentInstance;
    const changed = vi.fn();
    const closed = vi.fn();
    component.changed.subscribe(changed);
    component.closed.subscribe(closed);
    component.cambiarEstado();
    expect(iniciativaService.cambiarEstado).toHaveBeenCalledWith(10, 'EN_PROCESO');
    expect(changed).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
  });

  it.each([
    [409, 'Transición no permitida', 'Transición no permitida'],
    [403, 'Forbidden', 'No tiene permisos para gestionar iniciativas.'],
    [401, 'Unauthorized', 'No tiene permisos para gestionar iniciativas.'],
    [500, 'Error interno', 'No se pudo actualizar el estado. Intente nuevamente.'],
  ])('handles backend status %s', (status, message, expected) => {
    iniciativaService.cambiarEstado.mockReturnValue(throwError(() => apiError(status, message)));
    const component = create().componentInstance;
    component.cambiarEstado();
    expect(component.errorGeneral()).toBe(expected);
  });

  it('marks 404 for reload when the modal closes', () => {
    iniciativaService.cambiarEstado.mockReturnValue(throwError(() => apiError(404, 'Not found')));
    const component = create().componentInstance;
    const changed = vi.fn();
    component.changed.subscribe(changed);
    component.cambiarEstado();
    expect(component.errorGeneral()).toBe('La iniciativa ya no existe.');
    component.cerrar();
    expect(changed).toHaveBeenCalledOnce();
  });

  it('disables the action while the request is pending', () => {
    const pending = new Subject<Iniciativa>();
    iniciativaService.cambiarEstado.mockReturnValue(pending);
    const fixture = create();
    fixture.componentInstance.cambiarEstado();
    fixture.detectChanges();
    const primary = fixture.debugElement
      .queryAll(By.directive(Button))
      .map((item) => item.componentInstance as Button)
      .find((button) => button.variant() === 'primary');
    expect(primary?.disabled()).toBe(true);
    pending.complete();
  });

  it('clears an error when reopened', () => {
    iniciativaService.cambiarEstado.mockReturnValue(throwError(() => apiError(500, 'Error')));
    const fixture = create();
    fixture.componentInstance.cambiarEstado();
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorGeneral()).toBeNull();
  });
});
