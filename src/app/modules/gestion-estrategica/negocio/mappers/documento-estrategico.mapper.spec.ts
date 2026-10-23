import {
  DocumentoEstrategicoDto,
  DocumentosEstrategicosPageDto,
} from '../interfaces/documento-estrategico-dto.interface';
import { toDocumentoEstrategico, toDocumentosPagina } from './documento-estrategico.mapper';

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

describe('documento-estrategico.mapper', () => {
  it('maps a document from snake_case to camelCase', () => {
    const result = toDocumentoEstrategico(makeDocumentoDto());

    expect(result).toEqual({
      id: 7,
      planId: 5,
      nombre: 'Análisis PESTEL',
      nombreOriginal: 'informe.pdf',
      tipo: 'PDF',
      fechaSubida: new Date('2026-10-01T12:30:00.000Z'),
      url: 'https://storage.example/informe.pdf',
    });
    expect(result.fechaSubida).toBeInstanceOf(Date);
  });

  it.each([
    [null, 'ARCHIVO'],
    ['sin-extension', 'ARCHIVO'],
  ])('uses ARCHIVO when the original name is %s', (nombreOriginal, tipo) => {
    expect(toDocumentoEstrategico(makeDocumentoDto({ nombre_original: nombreOriginal })).tipo).toBe(
      tipo,
    );
  });

  it('maps an absent url to null', () => {
    const dto = makeDocumentoDto();
    delete dto.url;

    expect(toDocumentoEstrategico(dto).url).toBeNull();
  });

  it('maps page data and metadata', () => {
    const pageDto: DocumentosEstrategicosPageDto = {
      data: [makeDocumentoDto()],
      meta: { total: 23, page: 2, limit: 10, total_pages: 3 },
    };

    expect(toDocumentosPagina(pageDto)).toEqual({
      documentos: [expect.objectContaining({ id: 7, tipo: 'PDF' })],
      total: 23,
      pagina: 2,
      limite: 10,
      totalPaginas: 3,
    });
  });
});
