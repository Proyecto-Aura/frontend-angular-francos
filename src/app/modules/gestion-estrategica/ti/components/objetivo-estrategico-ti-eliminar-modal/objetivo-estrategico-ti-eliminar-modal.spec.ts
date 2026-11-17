import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';
import { ObjetivoEstrategicoTiEliminarModal } from './objetivo-estrategico-ti-eliminar-modal';

function makeObjetivoTi(overrides: Partial<ObjetivoEstrategicoTi> = {}): ObjetivoEstrategicoTi {
  return {
    id: 1,
    codigo: 'OETI-0001',
    planId: 5,
    nombre: 'Modernizar la infraestructura',
    descripcion: null,
    responsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    perspectivaOrden: 1,
    estadoCodigo: 'PENDIENTE',
    estadoNombre: 'Pendiente',
    relacionesDestinoIds: [],
    oeNegocioId: 100,
    oeNegocio: { id: 100, codigo: 'OE-0100', nombre: 'Incrementar la rentabilidad' },
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

describe('ObjetivoEstrategicoTiEliminarModal', () => {
  let objetivoService: { eliminar: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    objetivoService = { eliminar: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      providers: [{ provide: ObjetivoEstrategicoTiService, useValue: objetivoService }],
    });
  });

  function create(
    objetivo = makeObjetivoTi(),
    objetivosDelPlan: ObjetivoEstrategicoTi[] = [objetivo],
  ): ComponentFixture<ObjetivoEstrategicoTiEliminarModal> {
    const fixture = TestBed.createComponent(ObjetivoEstrategicoTiEliminarModal);
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

    expect(fixture.nativeElement.textContent).toContain(
      '«Modernizar la infraestructura» (OETI-0001)',
    );
    fixture.componentInstance.eliminar();

    expect(objetivoService.eliminar).toHaveBeenCalledWith(1);
    expect(deleted).toBe(1);
    expect(closed).toBe(1);
  });

  it('shows incoming and outgoing relationships with only an acknowledgement action', () => {
    const objetivo = makeObjetivoTi({ relacionesDestinoIds: [2] });
    const fixture = create(objetivo, [
      objetivo,
      makeObjetivoTi({ id: 2, codigo: 'OETI-0002', nombre: 'Objetivo destino' }),
      makeObjetivoTi({
        id: 3,
        codigo: 'OETI-0003',
        nombre: 'Objetivo origen',
        relacionesDestinoIds: [1],
      }),
    ]);
    const actionTexts = Array.from(
      fixture.nativeElement.querySelectorAll('app-ds-button'),
      (button: Element) => button.textContent?.trim(),
    );

    expect(fixture.nativeElement.textContent).toContain('Influye en: OETI-0002 · Objetivo destino');
    expect(fixture.nativeElement.textContent).toContain(
      'Recibe influencia de: OETI-0003 · Objetivo origen',
    );
    expect(actionTexts).toEqual(['Entendido']);
    fixture.componentInstance.eliminar();
    expect(objetivoService.eliminar).not.toHaveBeenCalled();
  });

  it.each([
    [409, 'El objetivo tiene KPIs asociados', 'El objetivo tiene KPIs asociados'],
    [403, 'Forbidden', 'No tiene permisos para eliminar objetivos estratégicos de TI.'],
    [500, 'Error interno', 'No se pudo eliminar el objetivo. Intente nuevamente.'],
  ])('shows the expected error for status %s without closing', (status, message, expected) => {
    const fixture = create();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    objetivoService.eliminar.mockReturnValue(throwError(() => httpError(status, message)));

    fixture.componentInstance.eliminar();

    expect(fixture.componentInstance.errorGeneral()).toBe(expected);
    expect(fixture.componentInstance.eliminando()).toBe(false);
    expect(closed).toBe(0);
  });
});
