import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DocumentoEstrategico } from '../../../negocio/interfaces/documento-estrategico.interface';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { DocumentoEstrategicoTiService } from '../../services/documento-estrategico-ti.service';
import { AnalisisEstrategicoTiPage } from './analisis-estrategico-ti';

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2026,
    anioFin: 2028,
    estadoCodigo: 'BORRADOR',
    estadoNombre: 'Borrador',
    activo: true,
    ...overrides,
  };
}

function makeDocumento(overrides: Partial<DocumentoEstrategico> = {}): DocumentoEstrategico {
  return {
    id: 7,
    planId: 5,
    nombre: 'Análisis PESTEL',
    nombreOriginal: 'analisis.pdf',
    tipo: 'PDF',
    fechaSubida: new Date('2026-10-01T12:30:00.000Z'),
    url: 'https://storage.example/analisis.pdf',
    ...overrides,
  };
}

function makePage(
  documentos: DocumentoEstrategico[] = [],
  overrides: Partial<{
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  }> = {},
) {
  return {
    documentos,
    total: documentos.length,
    pagina: 1,
    limite: 10,
    totalPaginas: 1,
    ...overrides,
  };
}

function makePlanSeleccionadoMock() {
  const planes = signal<PlanEstrategico[]>([makePlan()]);
  const planId = signal<number | null>(5);

  return {
    planes,
    planId,
    plan: computed(() => planes().find((plan) => plan.id === planId()) ?? null),
    cargando: signal(false),
    error: signal(false),
  };
}

describe('AnalisisEstrategicoTiPage', () => {
  let planSeleccionado: ReturnType<typeof makePlanSeleccionadoMock>;
  let documentoService: {
    listar: ReturnType<typeof vi.fn>;
    obtener: ReturnType<typeof vi.fn>;
    subir: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    planSeleccionado = makePlanSeleccionadoMock();
    documentoService = {
      listar: vi.fn().mockReturnValue(of(makePage())),
      obtener: vi.fn().mockReturnValue(of(makeDocumento())),
      subir: vi.fn().mockReturnValue(of(makeDocumento())),
      eliminar: vi.fn().mockReturnValue(of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PlanSeleccionadoService, useValue: planSeleccionado },
        { provide: DocumentoEstrategicoTiService, useValue: documentoService },
      ],
    });
  });

  function create(): ComponentFixture<AnalisisEstrategicoTiPage> {
    const fixture = TestBed.createComponent(AnalisisEstrategicoTiPage);
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ComponentFixture<AnalisisEstrategicoTiPage>): string {
    return (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
  }

  function findButton(
    fixture: ComponentFixture<AnalisisEstrategicoTiPage>,
    label: string,
  ): HTMLButtonElement {
    const button = (
      Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
    ).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === label || candidate.textContent?.includes(label),
    );
    expect(button).toBeTruthy();
    return button!;
  }

  it('shows the loading state without requesting documents when no plan is selected yet', () => {
    planSeleccionado.planes.set([]);
    planSeleccionado.planId.set(null);
    planSeleccionado.cargando.set(true);

    const fixture = create();

    expect(text(fixture)).toContain('Cargando…');
    expect(documentoService.listar).not.toHaveBeenCalled();
  });

  it('shows the no-plan message and link without requesting documents', () => {
    planSeleccionado.planes.set([]);
    planSeleccionado.planId.set(null);
    const fixture = create();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(text(fixture)).toContain('No hay planes estratégicos registrados.');
    expect(link.getAttribute('href')).toBe('/gestion-estrategica/plan-estrategico');
    expect(documentoService.listar).not.toHaveBeenCalled();
  });

  it.each([
    [1, '1 documento'],
    [2, '2 documentos'],
  ])('renders the TI title and the %i-document subtitle', (total, expected) => {
    const documentos = Array.from({ length: total }, (_, index) =>
      makeDocumento({ id: index + 1 }),
    );
    documentoService.listar.mockReturnValue(of(makePage(documentos)));

    const fixture = create();

    expect(text(fixture)).toContain('Análisis estratégico de TI');
    expect(text(fixture)).toContain(`${expected} en el plan Plan institucional`);
  });

  it('renders document name, original name, type badge and formatted upload date', () => {
    documentoService.listar.mockReturnValue(of(makePage([makeDocumento()])));
    const fixture = create();

    const renderedText = text(fixture);
    expect(renderedText).toContain('Análisis PESTEL');
    expect(renderedText).toContain('analisis.pdf');
    expect(renderedText).toContain('PDF');
    expect(renderedText).toContain(
      fixture.componentInstance.formatearFecha(new Date('2026-10-01T12:30:00.000Z')),
    );
  });

  it('shows the draft empty state when there are no documents', () => {
    const fixture = create();

    expect(text(fixture)).toContain('No hay documentos aún');
    expect(text(fixture)).toContain('Sube el primero con "Subir documento".');
  });

  it('shows the read-only empty state when there are no documents', () => {
    planSeleccionado.planes.set([makePlan({ estadoCodigo: 'ACTIVO', estadoNombre: 'Activo' })]);
    const fixture = create();

    expect(text(fixture)).toContain('No hay documentos aún');
    expect(text(fixture)).toContain('Este plan no registra documentos.');
  });

  it('enables upload and delete for a draft plan without a read-only banner', () => {
    documentoService.listar.mockReturnValue(of(makePage([makeDocumento()])));
    const fixture = create();

    expect(findButton(fixture, 'Subir documento').disabled).toBe(false);
    expect(findButton(fixture, 'Eliminar').disabled).toBe(false);
    expect(text(fixture)).not.toContain('Los documentos solo pueden consultarse.');
  });

  it.each(['ACTIVO', 'CERRADO'] as const)(
    'makes an %s plan read-only while keeping View enabled',
    (estadoCodigo) => {
      planSeleccionado.planes.set([
        makePlan({
          estadoCodigo,
          estadoNombre: estadoCodigo === 'ACTIVO' ? 'Activo' : 'Cerrado',
        }),
      ]);
      documentoService.listar.mockReturnValue(of(makePage([makeDocumento()])));
      const fixture = create();

      expect(findButton(fixture, 'Subir documento').disabled).toBe(true);
      expect(findButton(fixture, 'Eliminar').disabled).toBe(true);
      expect(findButton(fixture, 'Ver').disabled).toBe(false);
      expect(text(fixture)).toContain(
        'Este plan no está en Borrador. Los documentos solo pueden consultarse.',
      );
    },
  );

  it('shows a loading error and retries the document request', () => {
    documentoService.listar
      .mockReturnValueOnce(throwError(() => new Error('Server Error')))
      .mockReturnValue(of(makePage()));
    const fixture = create();

    expect(text(fixture)).toContain('No se pudieron cargar los documentos.');
    findButton(fixture, 'Reintentar').click();

    expect(documentoService.listar).toHaveBeenCalledTimes(2);
    expect(documentoService.listar).toHaveBeenLastCalledWith(5, 1, 10);
  });

  it('shows pagination only for multiple pages and requests a changed page', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('app-ds-pagination')).toBeNull();
    documentoService.listar.mockReturnValueOnce(
      of(makePage([makeDocumento()], { total: 11, totalPaginas: 2 })),
    );

    fixture.componentInstance.cargarDocumentos();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-ds-pagination')).toBeTruthy();
    documentoService.listar.mockReturnValueOnce(
      of(makePage([makeDocumento({ id: 8 })], { total: 11, pagina: 2, totalPaginas: 2 })),
    );
    fixture.componentInstance.cambiarPagina(2);
    expect(documentoService.listar).toHaveBeenLastCalledWith(5, 2, 10);
  });

  it('reloads page one when the selected plan changes', () => {
    const fixture = create();
    planSeleccionado.planes.set([
      makePlan(),
      makePlan({ id: 6, codigo: 'PE-0006', nombre: 'Plan nuevo' }),
    ]);
    planSeleccionado.planId.set(6);
    fixture.detectChanges();

    expect(documentoService.listar).toHaveBeenLastCalledWith(6, 1, 10);
  });

  it('closes the modal and reloads page one after an upload', () => {
    const fixture = create();
    fixture.componentInstance.modalActivo.set('subir');

    fixture.componentInstance.documentoSubido();

    expect(fixture.componentInstance.modalActivo()).toBeNull();
    expect(documentoService.listar).toHaveBeenLastCalledWith(5, 1, 10);
    expect(documentoService.listar).toHaveBeenCalledTimes(2);
  });

  it('returns to page one after deleting the only document on page two', () => {
    const fixture = create();
    documentoService.listar.mockReturnValueOnce(
      of(makePage([makeDocumento()], { total: 11, pagina: 2, totalPaginas: 2 })),
    );
    fixture.componentInstance.cambiarPagina(2);

    fixture.componentInstance.documentoEliminado();

    expect(documentoService.listar).toHaveBeenLastCalledWith(5, 1, 10);
  });

  it('opens View from its action and Delete without also triggering the row click', () => {
    documentoService.listar.mockReturnValue(of(makePage([makeDocumento()])));
    const fixture = create();

    findButton(fixture, 'Ver').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.modalActivo()).toBe('ver');
    expect(documentoService.obtener).toHaveBeenCalledOnce();
    expect(documentoService.obtener).toHaveBeenCalledWith(7);

    fixture.componentInstance.cerrarModal();
    fixture.detectChanges();
    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.modalActivo()).toBe('eliminar');
    expect(fixture.componentInstance.documentoSeleccionado()?.id).toBe(7);
    expect(documentoService.obtener).toHaveBeenCalledOnce();
  });
});
