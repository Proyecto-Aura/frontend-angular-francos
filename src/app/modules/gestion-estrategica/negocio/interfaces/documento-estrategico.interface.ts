export interface DocumentoEstrategico {
  id: number;
  planId: number;
  nombre: string;
  nombreOriginal: string | null;
  tipo: string;
  fechaSubida: Date;
  url: string | null;
}

export interface DocumentosEstrategicosPagina {
  documentos: DocumentoEstrategico[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}
