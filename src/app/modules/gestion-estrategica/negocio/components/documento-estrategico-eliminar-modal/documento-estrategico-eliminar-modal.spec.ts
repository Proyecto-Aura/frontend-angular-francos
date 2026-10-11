import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { DocumentoEstrategico } from '../../interfaces/documento-estrategico.interface';
import { DocumentoEstrategicoEliminarModal } from './documento-estrategico-eliminar-modal';

const DOCUMENTOS_BASE = `${environment.apiUrl}/documentos-estrategicos`;

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

describe('DocumentoEstrategicoEliminarModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(
    documento: DocumentoEstrategico | null = makeDocumento(),
    open = true,
  ): ComponentFixture<DocumentoEstrategicoEliminarModal> {
    const fixture = TestBed.createComponent(DocumentoEstrategicoEliminarModal);
    fixture.componentRef.setInput('documento', documento);
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the document and deletes it, emitting deleted and closed', () => {
    const fixture = create();
    let deleted = 0;
    let closed = 0;
    fixture.componentInstance.deleted.subscribe(() => deleted++);
    fixture.componentInstance.closed.subscribe(() => closed++);

    expect(fixture.nativeElement.textContent).toContain('«Análisis PESTEL» (analisis.pdf)');
    fixture.componentInstance.eliminar();

    const req = httpMock.expectOne(`${DOCUMENTOS_BASE}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(deleted).toBe(1);
    expect(closed).toBe(1);
  });

  it.each([
    [409, 'Solo se pueden eliminar documentos cuando el plan está en Borrador'],
    [403, 'No tiene permisos para gestionar documentos estratégicos.'],
    [500, 'No se pudo eliminar el documento. Intente nuevamente.'],
  ])('handles a %i delete error without emitting deleted', (status, expectedMessage) => {
    const fixture = create();
    let deleted = 0;
    fixture.componentInstance.deleted.subscribe(() => deleted++);

    fixture.componentInstance.eliminar();
    httpMock.expectOne(`${DOCUMENTOS_BASE}/7`).flush(
      {
        message:
          status === 409
            ? 'Solo se pueden eliminar documentos cuando el plan está en Borrador'
            : 'Error',
      },
      { status, statusText: 'Error' },
    );

    expect(fixture.componentInstance.errorGeneral()).toBe(expectedMessage);
    expect(deleted).toBe(0);
  });

  it('does not request deletion without a selected document', () => {
    const component = create(null).componentInstance;

    component.eliminar();

    httpMock.expectNone((request) => request.url.startsWith(DOCUMENTOS_BASE));
  });

  it('clears the previous error when reopened', () => {
    const fixture = create(makeDocumento(), false);
    fixture.componentInstance.errorGeneral.set('Error anterior');

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(fixture.componentInstance.errorGeneral()).toBeNull();
  });
});
