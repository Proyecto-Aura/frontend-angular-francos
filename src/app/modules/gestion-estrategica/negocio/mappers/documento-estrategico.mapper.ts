import {
  DocumentoEstrategicoDto,
  DocumentosEstrategicosPageDto,
} from '../interfaces/documento-estrategico-dto.interface';
import {
  DocumentoEstrategico,
  DocumentosEstrategicosPagina,
} from '../interfaces/documento-estrategico.interface';

function tipoDeArchivo(nombreOriginal: string | null): string {
  const extension = nombreOriginal?.split('.').pop()?.trim();
  return extension ? extension.toUpperCase() : 'ARCHIVO';
}

export function toDocumentoEstrategico(dto: DocumentoEstrategicoDto): DocumentoEstrategico {
  return {
    id: dto.id,
    planId: dto.plan_estrategico_id,
    nombre: dto.nombre,
    nombreOriginal: dto.nombre_original,
    tipo: tipoDeArchivo(dto.nombre_original),
    fechaSubida: new Date(dto.created_at),
    url: dto.url ?? null,
  };
}

export function toDocumentosPagina(
  pageDto: DocumentosEstrategicosPageDto,
): DocumentosEstrategicosPagina {
  return {
    documentos: pageDto.data.map(toDocumentoEstrategico),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    limite: pageDto.meta.limit,
    totalPaginas: pageDto.meta.total_pages,
  };
}
