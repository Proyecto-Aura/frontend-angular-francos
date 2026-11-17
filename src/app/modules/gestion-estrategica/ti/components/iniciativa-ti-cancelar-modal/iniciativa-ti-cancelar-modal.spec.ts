import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Iniciativa } from '../../../negocio/interfaces/iniciativa.interface';
import { IniciativaTiService } from '../../services/iniciativa-ti.service';
import { IniciativaTiCancelarModal } from './iniciativa-ti-cancelar-modal';

function makeIniciativa(): Iniciativa {
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
  };
}

function apiError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    error: { statusCode: status, message },
    status,
    statusText: 'Error',
  });
}

describe('IniciativaTiCancelarModal', () => {
  const iniciativaService = { cambiarEstado: vi.fn(() => of(makeIniciativa())) };

  beforeEach(() => {
    iniciativaService.cambiarEstado.mockReset();
    iniciativaService.cambiarEstado.mockReturnValue(of(makeIniciativa()));
    TestBed.configureTestingModule({
      providers: [{ provide: IniciativaTiService, useValue: iniciativaService }],
    });
  });

  function create(): ComponentFixture<IniciativaTiCancelarModal> {
    const fixture = TestBed.createComponent(IniciativaTiCancelarModal);
    fixture.componentRef.setInput('iniciativa', makeIniciativa());
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it.each(['', '   '])('requires a non-empty cancellation reason', (motivo) => {
    const component = create().componentInstance;
    component.motivo.set(motivo);
    component.cancelar();
    expect(component.errorMotivo()).toBe('El motivo de cancelación es obligatorio.');
    expect(iniciativaService.cambiarEstado).not.toHaveBeenCalled();
  });

  it('rejects cancellation reasons longer than 500 characters', () => {
    const component = create().componentInstance;
    component.motivo.set('a'.repeat(501));
    component.cancelar();
    expect(component.errorMotivo()).toBe('El motivo admite hasta 500 caracteres.');
    expect(iniciativaService.cambiarEstado).not.toHaveBeenCalled();
  });

  it('cancels with a reason and emits cancelled and closed', () => {
    const component = create().componentInstance;
    const cancelled = vi.fn();
    const closed = vi.fn();
    component.cancelled.subscribe(cancelled);
    component.closed.subscribe(closed);
    component.motivo.set('Se reasignó el presupuesto');
    component.cancelar();
    expect(iniciativaService.cambiarEstado).toHaveBeenCalledWith(
      10,
      'CANCELADA',
      'Se reasignó el presupuesto',
    );
    expect(cancelled).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
  });

  it('clears the reason and its error when reopened', () => {
    const fixture = create();
    fixture.componentInstance.motivo.set('Texto');
    fixture.componentInstance.errorMotivo.set('Error');
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.motivo()).toBe('');
    expect(fixture.componentInstance.errorMotivo()).toBeNull();
  });

  it.each([
    [400, 'El motivo es obligatorio', 'El motivo es obligatorio'],
    [409, 'Transición no permitida', 'Transición no permitida'],
    [403, 'Forbidden', 'No tiene permisos para gestionar iniciativas.'],
    [401, 'Unauthorized', 'No tiene permisos para gestionar iniciativas.'],
    [500, 'Error interno', 'No se pudo actualizar el estado. Intente nuevamente.'],
  ])('handles backend status %s', (status, message, expected) => {
    iniciativaService.cambiarEstado.mockReturnValue(throwError(() => apiError(status, message)));
    const component = create().componentInstance;
    component.motivo.set('Motivo válido');
    component.cancelar();
    expect(component.errorGeneral()).toBe(expected);
  });

  it('marks 404 for reload when the modal closes', () => {
    iniciativaService.cambiarEstado.mockReturnValue(throwError(() => apiError(404, 'Not found')));
    const component = create().componentInstance;
    const cancelled = vi.fn();
    component.cancelled.subscribe(cancelled);
    component.motivo.set('Motivo válido');
    component.cancelar();
    expect(component.errorGeneral()).toBe('La iniciativa ya no existe.');
    component.cerrar();
    expect(cancelled).toHaveBeenCalledOnce();
  });

  it('disables the cancel button while saving', () => {
    const pending = new Subject<Iniciativa>();
    iniciativaService.cambiarEstado.mockReturnValue(pending);
    const fixture = create();
    fixture.componentInstance.motivo.set('Motivo válido');
    fixture.componentInstance.cancelar();
    fixture.detectChanges();
    const destructive = fixture.debugElement
      .queryAll(By.directive(Button))
      .map((item) => item.componentInstance as Button)
      .find((button) => button.variant() === 'destructive');
    expect(destructive?.disabled()).toBe(true);
    pending.complete();
  });
});
