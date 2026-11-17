export type TipoComprobanteDto = 'boleta' | 'factura';

/** Serie tal como la responde `GET /series-comprobante`. */
export interface SerieComprobanteDto {
  id: number;
  tipo: TipoComprobanteDto;
  serie: string;
  correlativo_inicio: number;
  correlativo_fin: number;
  /** Último número emitido; null mientras la serie no haya emitido ninguno. */
  correlativo_actual: number | null;
  /** Próximo número a emitir; null si la serie se agotó. */
  siguiente: number | null;
  restantes: number;
  umbral_alerta: number;
  por_agotar: boolean;
  estado: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginaSeriesDto {
  data: SerieComprobanteDto[];
  meta: { total: number; page: number; limit: number; total_pages: number };
}

export interface CrearSerieRequestDto {
  tipo: TipoComprobanteDto;
  serie: string;
  correlativo_inicio: number;
  correlativo_fin: number;
  estado: boolean;
}

/** PATCH: solo viaja lo que cambió. */
export type ActualizarSerieRequestDto = Partial<Omit<CrearSerieRequestDto, 'estado'>>;
