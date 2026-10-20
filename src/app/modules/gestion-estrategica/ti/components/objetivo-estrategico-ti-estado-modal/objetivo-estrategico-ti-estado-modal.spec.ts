import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EstadoObjetivoCodigo } from '../../../negocio/interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';
import { ObjetivoEstrategicoTiEstadoModal } from './objetivo-estrategico-ti-estado-modal';

function estadoNombre(estado: EstadoObjetivoCodigo): string {
  if (estado === 'EN_PROCESO') return 'En proceso';
  if (estado === 'CUMPLIDO') return 'Cumplido';
  if (estado === 'CANCELADO') return 'Cancelado';
  return 'Pendiente';
}

function makeObjetivoTi(
  estadoCodigo: EstadoObjetivoCodigo = 'PENDIENTE',
  overrides: Partial<ObjetivoEstrategicoTi> = {},
): ObjetivoEstrategicoTi {
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
    estadoCodigo,
    estadoNombre: estadoNombre(estadoCodigo),
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

describe('ObjetivoEstrategicoTiEstadoModal', () => {
  let objetivoService: { cambiarEstado: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    objetivoService = {
      cambiarEstado: vi.fn((_id: number, estado: EstadoObjetivoCodigo) =>
        of(makeObjetivoTi(estado)),
      ),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ObjetivoEstrategicoTiService, useValue: objetivoService }],
    });
  });

  function create(objetivo = makeObjetivoTi()): ComponentFixture<ObjetivoEstrategicoTiEstadoModal> {
    const fixture = TestBed.createComponent(ObjetivoEstrategicoTiEstadoModal);
    fixture.componentRef.setInput('objetivo', objetivo);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  it('allows only valid transitions from pending and in-progress states', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    expect(component.puedeSeleccionar('EN_PROCESO')).toBe(true);
    expect(component.puedeSeleccionar('CANCELADO')).toBe(true);
    expect(component.puedeSeleccionar('CUMPLIDO')).toBe(false);
    expect(component.puedeSeleccionar('PENDIENTE')).toBe(false);

    fixture.componentRef.setInput('objetivo', makeObjetivoTi('EN_PROCESO'));
    fixture.detectChanges();
    expect(component.puedeSeleccionar('CUMPLIDO')).toBe(true);
    expect(component.puedeSeleccionar('CANCELADO')).toBe(true);
    expect(component.puedeSeleccionar('PENDIENTE')).toBe(false);
  });

  it.each(['CUMPLIDO', 'CANCELADO'] as EstadoObjetivoCodigo[])(
    'allows no transition from final state %s',
    (estado) => {
      const component = create(makeObjetivoTi(estado)).componentInstance;

      expect(
        (['PENDIENTE', 'EN_PROCESO', 'CUMPLIDO', 'CANCELADO'] as EstadoObjetivoCodigo[]).some(
          (destino) => component.puedeSeleccionar(destino),
        ),
      ).toBe(false);
    },
  );

  it('renders the current state as disabled and keeps save disabled initially', () => {
    const fixture = create();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const currentButton = buttons.find((button) => button.textContent?.includes('(actual)'));
    const saveButton = buttons.find((button) => button.textContent?.trim() === 'Guardar');

    expect(currentButton?.disabled).toBe(true);
    expect(fixture.componentInstance.puedeGuardar()).toBe(false);
    expect(saveButton?.disabled).toBe(true);
  });

  it.each(['CUMPLIDO', 'CANCELADO'] as EstadoObjetivoCodigo[])(
    'shows the final-state note when selecting %s',
    (estado) => {
      const fixture = create(makeObjetivoTi('EN_PROCESO'));

      fixture.componentInstance.seleccionar(estado);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Es un estado final: después no podrá cambiarse.',
      );
    },
  );

  it('shows the transition flow for a state that admits changes', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain(
      'Flujo: Pendiente → En proceso → Cumplido. Puede cancelarse mientras no esté cumplido.',
    );
  });

  it.each([
    ['CUMPLIDO', 'cumplido'],
    ['CANCELADO', 'cancelado'],
  ] as [EstadoObjetivoCodigo, string][])(
    'shows the final flow message for %s',
    (estado, nombre) => {
      const fixture = create(makeObjetivoTi(estado));

      expect(fixture.nativeElement.textContent).toContain(
        `Este objetivo está ${nombre} y ya no puede cambiar de estado.`,
      );
    },
  );

  it('shows the objective code and name in the modal description', () => {
    const fixture = create();

    expect(fixture.componentInstance.descripcionModal()).toBe(
      'OETI-0001 · Modernizar la infraestructura',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'OETI-0001 · Modernizar la infraestructura',
    );
  });

  it('changes state and emits saved and closed', () => {
    const fixture = create();
    const saved: ObjetivoEstrategicoTi[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((objetivo) => saved.push(objetivo));
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentInstance.seleccionar('EN_PROCESO');

    fixture.componentInstance.guardar();

    expect(objetivoService.cambiarEstado).toHaveBeenCalledWith(1, 'EN_PROCESO');
    expect(saved).toEqual([expect.objectContaining({ estadoCodigo: 'EN_PROCESO' })]);
    expect(closed).toBe(1);
  });

  it.each([
    [409, 'Transición de estado no permitida', 'Transición de estado no permitida'],
    [403, 'Forbidden', 'No tiene permisos para cambiar el estado del objetivo de TI.'],
    [500, 'Error interno', 'No se pudo cambiar el estado. Intente nuevamente.'],
  ])('shows the expected error for status %s', (status, message, expected) => {
    const fixture = create();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    objetivoService.cambiarEstado.mockReturnValue(throwError(() => httpError(status, message)));
    fixture.componentInstance.seleccionar('EN_PROCESO');

    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errorGeneral()).toBe(expected);
    expect(fixture.componentInstance.guardando()).toBe(false);
    expect(closed).toBe(0);
  });

  it('resets selection and errors when reopened', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.seleccionar('EN_PROCESO');
    component.errorGeneral.set('Error');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(component.estadoSeleccionado()).toBe('PENDIENTE');
    expect(component.errorGeneral()).toBeNull();
  });
});
