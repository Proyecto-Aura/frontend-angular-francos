export interface DocumentoEstrategicoDto {
  id: number;
  plan_estrategico_id: number;
  nombre: string;
  nombre_original: string | null;
  estado: boolean;
  created_at: string;
  updated_at: string;
  url?: string;
}

export interface DocumentosEstrategicosPageDto {
  data: DocumentoEstrategicoDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface DocumentoEstrategicoApiErrorDto {
  message: string | string[];
}
