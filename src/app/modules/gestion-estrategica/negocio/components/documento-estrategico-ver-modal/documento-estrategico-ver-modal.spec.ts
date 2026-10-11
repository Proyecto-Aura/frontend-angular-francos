import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { DocumentoEstrategicoDto } from '../../interfaces/documento-estrategico-dto.interface';
import { DocumentoEstrategico } from '../../interfaces/documento-estrategico.interface';
import { DocumentoEstrategicoVerModal } from './documento-estrategico-ver-modal';

const DOCUMENTOS_BASE = `${environment.apiUrl}/documentos-estrategicos`;

function makeDocumento(overrides: Partial<DocumentoEstrategico> = {}): DocumentoEstrategico {
  return {
    id: 7,
    planId: 5,
    nombre: 'Análisis PESTEL',
    nombreOriginal: 'analisis.pdf',
    tipo: 'PDF',
    fechaSubida: new Date('2026-10-01T12:30:00.000Z'),
    url: 'https://storage.example/listado.pdf',
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
    url: 'https://storage.example/fresh.pdf',
    ...overrides,
  };
}

describe('DocumentoEstrategicoVerModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(
    documento = makeDocumento(),
    open = true,
  ): ComponentFixture<DocumentoEstrategicoVerModal> {
    const fixture = TestBed.createComponent(DocumentoEstrategicoVerModal);
    fixture.componentRef.setInput('documento', documento);
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
    return fixture;
  }

  function expectGet(id = 7): TestRequest {
    const req = httpMock.expectOne(`${DOCUMENTOS_BASE}/${id}`);
    expect(req.request.method).toBe('GET');
    return req;
  }

  it('gets a fresh url on open and requests it again after reopening', () => {
    const fixture = create();
    expectGet().flush(makeDocumentoDto());

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expectGet().flush(makeDocumentoDto({ url: 'https://storage.example/newer.pdf' }));
  });

  it('renders a PDF iframe and download link using the backend url', () => {
    const fixture = create();
    const url = 'https://storage.example/fresh.pdf';
    expectGet().flush(makeDocumentoDto({ url }));
    fixture.detectChanges();

    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    const download = fixture.nativeElement.querySelector('a[download]') as HTMLAnchorElement;
    expect(iframe).toBeTruthy();
    expect(iframe.src).toBe(url);
    expect(download.href).toBe(url);
  });

  it('renders an image preview', () => {
    const fixture = create(makeDocumento({ nombreOriginal: 'mapa.png', tipo: 'PNG' }));
    const url = 'https://storage.example/mapa.png';
    expectGet().flush(makeDocumentoDto({ nombre_original: 'mapa.png', url }));
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(image).toBeTruthy();
    expect(image.src).toBe(url);
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('shows the no-preview message for a DOCX without iframe or image', () => {
    const fixture = create(makeDocumento({ nombreOriginal: 'informe.docx', tipo: 'DOCX' }));
    expectGet().flush(
      makeDocumentoDto({
        nombre_original: 'informe.docx',
        url: 'https://storage.example/informe.docx',
      }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Vista previa no disponible para este tipo de archivo.',
    );
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('shows an error when the GET fails and does not render an iframe', () => {
    const fixture = create();
    expectGet().flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No se pudo abrir el documento.');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('shows an error when the backend response has no url', () => {
    const fixture = create();
    const dto = makeDocumentoDto();
    delete dto.url;
    expectGet().flush(dto);
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe(true);
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('ignores a late response from a previously selected document', () => {
    const fixture = create();
    const previousRequest = expectGet(7);
    fixture.componentRef.setInput(
      'documento',
      makeDocumento({ id: 8, nombre: 'Mapa estratégico', nombreOriginal: 'mapa.png', tipo: 'PNG' }),
    );
    fixture.detectChanges();
    const currentRequest = expectGet(8);

    currentRequest.flush(
      makeDocumentoDto({
        id: 8,
        nombre: 'Mapa estratégico',
        nombre_original: 'mapa.png',
        url: 'https://storage.example/current.png',
      }),
    );
    previousRequest.flush(makeDocumentoDto({ url: 'https://storage.example/late.pdf' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.documentoActual()).toEqual(
      expect.objectContaining({ id: 8, url: 'https://storage.example/current.png' }),
    );
    expect((fixture.nativeElement.querySelector('img') as HTMLImageElement).src).toBe(
      'https://storage.example/current.png',
    );
  });

  it('emits closed from the close action', () => {
    const fixture = create();
    expectGet().flush(makeDocumentoDto());
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.cerrar();

    expect(closed).toBe(1);
  });
});
