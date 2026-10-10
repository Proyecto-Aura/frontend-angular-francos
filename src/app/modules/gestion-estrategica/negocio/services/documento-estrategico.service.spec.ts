import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import {
  DocumentoEstrategicoDto,
  DocumentosEstrategicosPageDto,
} from '../interfaces/documento-estrategico-dto.interface';
import { DocumentoEstrategicoService } from './documento-estrategico.service';

const DOCUMENTOS_BASE = `${environment.apiUrl}/documentos-estrategicos`;

function makeDocumentoDto(
  overrides: Partial<DocumentoEstrategicoDto> = {},
): DocumentoEstrategicoDto {
  return {
    id: 7,
    plan_estrategico_id: 5,
    nombre: 'Análisis PESTEL',
    nombre_original: 'informe.pdf',
    estado: true,
    created_at: '2026-10-01T12:30:00.000Z',
    updated_at: '2026-10-02T12:30:00.000Z',
    url: 'https://storage.example/informe.pdf',
    ...overrides,
  };
}

function makePageDto(): DocumentosEstrategicosPageDto {
  return {
    data: [makeDocumentoDto()],
    meta: { total: 11, page: 2, limit: 10, total_pages: 2 },
  };
}

describe('DocumentoEstrategicoService', () => {
  let service: DocumentoEstrategicoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DocumentoEstrategicoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a mapped document page with plan and pagination params', () => {
    let result: unknown;
    service.listar(5, 2, 10).subscribe((page) => (result = page));

    const req = httpMock.expectOne(
      (request) =>
        request.url === DOCUMENTOS_BASE &&
        request.params.get('plan_estrategico_id') === '5' &&
        request.params.get('page') === '2' &&
        request.params.get('limit') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush(makePageDto());

    expect(result).toEqual({
      documentos: [expect.objectContaining({ id: 7, planId: 5, tipo: 'PDF' })],
      total: 11,
      pagina: 2,
      limite: 10,
      totalPaginas: 2,
    });
  });

  it('gets and maps one document with its fresh url', () => {
    let result: unknown;
    service.obtener(7).subscribe((documento) => (result = documento));

    const req = httpMock.expectOne(`${DOCUMENTOS_BASE}/7`);
    expect(req.request.method).toBe('GET');
    req.flush(makeDocumentoDto({ url: 'https://storage.example/fresh.pdf' }));

    expect(result).toEqual(
      expect.objectContaining({ id: 7, url: 'https://storage.example/fresh.pdf' }),
    );
  });

  it('uploads a document as FormData without setting Content-Type', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    service.subir(5, '  Análisis  ', file).subscribe();

    const req = httpMock.expectOne(DOCUMENTOS_BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Content-Type')).toBe(false);
    expect(req.request.body).toBeInstanceOf(FormData);
    const body = req.request.body as FormData;
    expect(body.get('plan_estrategico_id')).toBe('5');
    expect(body.get('nombre')).toBe('Análisis');
    expect(body.get('archivo')).toBe(file);
    req.flush(makeDocumentoDto());
  });

  it('deletes a document by id', () => {
    service.eliminar(7).subscribe();

    const req = httpMock.expectOne(`${DOCUMENTOS_BASE}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
