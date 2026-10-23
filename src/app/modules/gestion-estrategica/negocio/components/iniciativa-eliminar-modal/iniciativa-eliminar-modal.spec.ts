import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Iniciativa } from '../../interfaces/iniciativa.interface';
import { IniciativaService } from '../../services/iniciativa.service';
import { IniciativaEliminarModal } from './iniciativa-eliminar-modal';

function makeIniciativa(): Iniciativa {
  return {
    id: 10,
    codigo: 'INI-001',
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

describe('IniciativaEliminarModal', () => {
  const iniciativaService = { eliminar: vi.fn(() => of(undefined)) };

  beforeEach(() => {
    iniciativaService.eliminar.mockReset();
    iniciativaService.eliminar.mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [{ provide: IniciativaService, useValue: iniciativaService }],
    });
  });

  function create(): ComponentFixture<IniciativaEliminarModal> {
    const fixture = TestBed.createComponent(IniciativaEliminarModal);
    fixture.componentRef.setInput('iniciativa', makeIniciativa());
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it('shows name and code and emits deleted and closed after deletion', () => {
    const fixture = create();
    const deleted = vi.fn();
    const closed = vi.fn();
    fixture.componentInstance.deleted.subscribe(deleted);
    fixture.componentInstance.closed.subscribe(closed);
    expect(fixture.nativeElement.textContent).toContain('«Programa de fidelización» (INI-001)');
    fixture.componentInstance.eliminar();
    expect(iniciativaService.eliminar).toHaveBeenCalledWith(10);
    expect(deleted).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
  });

  it.each([
    [409, 'Solo se eliminan iniciativas pendientes', 'Solo se eliminan iniciativas pendientes'],
    [403, 'Forbidden', 'No tiene permisos para gestionar iniciativas.'],
    [401, 'Unauthorized', 'No tiene permisos para gestionar iniciativas.'],
    [500, 'Error interno', 'No se pudo eliminar la iniciativa. Intente nuevamente.'],
  ])('handles backend status %s', (status, message, expected) => {
    iniciativaService.eliminar.mockReturnValue(throwError(() => apiError(status, message)));
    const component = create().componentInstance;
    component.eliminar();
    expect(component.errorGeneral()).toBe(expected);
  });

  it('marks 404 for reload when the modal closes', () => {
    iniciativaService.eliminar.mockReturnValue(throwError(() => apiError(404, 'Not found')));
    const component = create().componentInstance;
    const deleted = vi.fn();
    component.deleted.subscribe(deleted);
    component.eliminar();
    expect(component.errorGeneral()).toBe('La iniciativa ya no existe.');
    component.cerrar();
    expect(deleted).toHaveBeenCalledOnce();
  });

  it('disables delete while the request is pending', () => {
    const pending = new Subject<undefined>();
    iniciativaService.eliminar.mockReturnValue(pending);
    const fixture = create();
    fixture.componentInstance.eliminar();
    fixture.detectChanges();
    const destructive = fixture.debugElement
      .queryAll(By.directive(Button))
      .map((item) => item.componentInstance as Button)
      .find((button) => button.variant() === 'destructive');
    expect(destructive?.disabled()).toBe(true);
    pending.complete();
  });

  it('clears a previous error when reopened', () => {
    iniciativaService.eliminar.mockReturnValue(throwError(() => apiError(500, 'Error')));
    const fixture = create();
    fixture.componentInstance.eliminar();
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.errorGeneral()).toBeNull();
  });
});
