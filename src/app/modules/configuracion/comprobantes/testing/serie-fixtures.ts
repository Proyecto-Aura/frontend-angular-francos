import {
  PaginaSeriesDto,
  SerieComprobanteDto,
} from '../interfaces/serie-comprobante-dto.interface';

export function makeSerieDto(overrides: Partial<SerieComprobanteDto> = {}): SerieComprobanteDto {
  return {
    id: 1,
    tipo: 'factura',
    serie: 'F001',
    correlativo_inicio: 1,
    correlativo_fin: 99_999_999,
    correlativo_actual: 1847,
    siguiente: 1848,
    restantes: 99_998_152,
    umbral_alerta: 100,
    por_agotar: false,
    estado: true,
    created_at: '2026-10-01T12:00:00.000Z',
    updated_at: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

export function makePaginaSeriesDto(series: SerieComprobanteDto[]): PaginaSeriesDto {
  return { data: series, meta: { total: series.length, page: 1, limit: 100, total_pages: 1 } };
}
