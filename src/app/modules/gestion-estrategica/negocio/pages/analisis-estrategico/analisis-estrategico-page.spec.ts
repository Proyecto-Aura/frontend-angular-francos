import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import {
  DocumentoEstrategicoDto,
  DocumentosEstrategicosPageDto,
} from '../../interfaces/documento-estrategico-dto.interface';
import { AnalisisEstrategicoPage } from './analisis-estrategico-page';

const DOCUMENTOS_BASE = `${environment.apiUrl}/documentos-estrategicos`;

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

function makeDocumentoDto(
  overrides: Partial<DocumentoEstrategicoDto> = {},
): DocumentoEstrategicoDto {
  return {
    id: 7,
    plan_estrategico_id: 5,
    nombre: 'Análisis PESTEL',
    nombre_original: 'analisis.pdf',
    estado: true,
    created_at: '2026-10-01T12:30:00.000Z',
    updated_at: '2026-10-01T12:30:00.000Z',
    url: 'https://storage.example/analisis.pdf',
    ...overrides,
  };
}

function makePageDto(
  documentos: DocumentoEstrategicoDto[] = [],
  overrides: Partial<DocumentosEstrategicosPageDto['meta']> = {},
): DocumentosEstrategicosPageDto {
  return {
    data: documentos,
    meta: {
      total: documentos.length,
      page: 1,
      limit: 10,
      total_pages: 1,
      ...overrides,
    },
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

describe('AnalisisEstrategicoPage', () => {
  let httpMock: HttpTestingController;
  let planSeleccionado: ReturnType<typeof makePlanSeleccionadoMock>;

  beforeEach(() => {
    planSeleccionado = makePlanSeleccionadoMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PlanSeleccionadoService, useValue: planSeleccionado },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(): ComponentFixture<AnalisisEstrategicoPage> {
    const fixture = TestBed.createComponent(AnalisisEstrategicoPage);
    fixture.detectChanges();
    return fixture;
  }

  function expectDocuments(planId = 5, page = 1): TestRequest {
    const req = httpMock.expectOne(
      (request) =>
        request.url === DOCUMENTOS_BASE &&
        request.params.get('plan_estrategico_id') === String(planId) &&
        request.params.get('page') === String(page) &&
        request.params.get('limit') === '10',
    );
    expect(req.request.method).toBe('GET');
    return req;
  }

  function text(fixture: ComponentFixture<AnalisisEstrategicoPage>): string {
    return (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');
  }

  function findButton(
    fixture: ComponentFixture<AnalisisEstrategicoPage>,
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
    httpMock.expectNone((request) => request.url === DOCUMENTOS_BASE);
  });

  it('shows the no-plan message and link without requesting documents', () => {
    planSeleccionado.planes.set([]);
    planSeleccionado.planId.set(null);
    const fixture = create();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    expect(text(fixture)).toContain('No hay planes estratégicos registrados.');
    expect(link.getAttribute('href')).toBe('/gestion-estrategica/plan-estrategico');
    httpMock.expectNone((request) => request.url === DOCUMENTOS_BASE);
  });

  it.each([
    [1, '1 documento'],
    [2, '2 documentos'],
  ])('loads the selected plan and renders the %i-document subtitle', (total, expected) => {
    const fixture = create();
    const documentos = Array.from({ length: total }, (_, index) =>
      makeDocumentoDto({ id: index + 1 }),
    );
    expectDocuments().flush(makePageDto(documentos));
    fixture.detectChanges();

    expect(text(fixture)).toContain(`${expected} en el plan Plan institucional`);
  });

  it('renders document name, type badge and formatted upload date', () => {
    const fixture = create();
    expectDocuments().flush(makePageDto([makeDocumentoDto()]));
    fixture.detectChanges();

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
    expectDocuments().flush(makePageDto());
    fixture.detectChanges();

    expect(text(fixture)).toContain('No hay documentos aún');
    expect(text(fixture)).toContain('Sube el primero con "Subir documento".');
  });

  it('enables upload and delete for a draft plan without a read-only banner', () => {
    const fixture = create();
    expectDocuments().flush(makePageDto([makeDocumentoDto()]));
    fixture.detectChanges();

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
      const fixture = create();
      expectDocuments().flush(makePageDto([makeDocumentoDto()]));
      fixture.detectChanges();

      expect(findButton(fixture, 'Subir documento').disabled).toBe(true);
      expect(findButton(fixture, 'Eliminar').disabled).toBe(true);
      expect(findButton(fixture, 'Ver').disabled).toBe(false);
      expect(text(fixture)).toContain(
        'Este plan no está en Borrador. Los documentos solo pueden consultarse.',
      );
    },
  );

  it('shows a loading error and retries the document request', () => {
    const fixture = create();
    expectDocuments().flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(text(fixture)).toContain('No se pudieron cargar los documentos.');
    findButton(fixture, 'Reintentar').click();
    expectDocuments().flush(makePageDto());
  });

  it('shows pagination only for multiple pages and requests a changed page', () => {
    const fixture = create();
    expectDocuments().flush(makePageDto([makeDocumentoDto()], { total: 11, total_pages: 2 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-ds-pagination')).toBeTruthy();
    fixture.componentInstance.cambiarPagina(2);
    expectDocuments(5, 2).flush(
      makePageDto([makeDocumentoDto({ id: 8 })], { total: 11, page: 2, total_pages: 2 }),
    );

    const singlePageFixture = TestBed.createComponent(AnalisisEstrategicoPage);
    singlePageFixture.detectChanges();
    expectDocuments().flush(makePageDto());
    singlePageFixture.detectChanges();
    expect(singlePageFixture.nativeElement.querySelector('app-ds-pagination')).toBeNull();
  });

  it('reloads page one when the selected plan changes', () => {
    const fixture = create();
    expectDocuments().flush(makePageDto());
    planSeleccionado.planes.set([
      makePlan(),
      makePlan({ id: 6, codigo: 'PE-0006', nombre: 'Plan nuevo' }),
    ]);
    planSeleccionado.planId.set(6);
    fixture.detectChanges();

    expectDocuments(6, 1).flush(makePageDto());
  });

  it('closes the modal and reloads page one after an upload', () => {
    const fixture = create();
    expectDocuments().flush(makePageDto());
    fixture.componentInstance.modalActivo.set('subir');

    fixture.componentInstance.documentoSubido();

    expect(fixture.componentInstance.modalActivo()).toBeNull();
    expectDocuments(5, 1).flush(makePageDto());
  });

  it('returns to page one after deleting the only document on page two', () => {
    const fixture = create();
    expectDocuments().flush(makePageDto());
    fixture.componentInstance.cambiarPagina(2);
    expectDocuments(5, 2).flush(
      makePageDto([makeDocumentoDto()], { total: 11, page: 2, total_pages: 2 }),
    );

    fixture.componentInstance.documentoEliminado();

    expectDocuments(5, 1).flush(makePageDto());
  });

  it('opens View from its action and Delete without also triggering the row click', () => {
    const fixture = create();
    expectDocuments().flush(makePageDto([makeDocumentoDto()]));
    fixture.detectChanges();

    findButton(fixture, 'Ver').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.modalActivo()).toBe('ver');
    httpMock
      .expectOne(`${DOCUMENTOS_BASE}/7`)
      .flush(makeDocumentoDto({ url: 'https://storage.example/fresh.pdf' }));

    fixture.componentInstance.cerrarModal();
    fixture.detectChanges();
    findButton(fixture, 'Eliminar').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.modalActivo()).toBe('eliminar');
    expect(fixture.componentInstance.documentoSeleccionado()?.id).toBe(7);
    httpMock.expectNone(`${DOCUMENTOS_BASE}/7`);
  });
});
