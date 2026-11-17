import {
  ActualizarSerieRequestDto,
  CrearSerieRequestDto,
  SerieComprobanteDto,
} from '../interfaces/serie-comprobante-dto.interface';
import { SerieComprobante, SerieForm } from '../interfaces/serie-comprobante.interface';

export function toSerieComprobante(dto: SerieComprobanteDto): SerieComprobante {
  return {
    id: dto.id,
    tipo: dto.tipo,
    codigo: dto.serie,
    inicio: dto.correlativo_inicio,
    fin: dto.correlativo_fin,
    ultimoEmitido: dto.correlativo_actual,
    siguiente: dto.siguiente,
    restantes: dto.restantes,
    activa: dto.estado,
  };
}

export function toCrearSerieRequest(form: SerieForm): CrearSerieRequestDto {
  return {
    tipo: form.tipo,
    serie: form.serie.trim().toUpperCase(),
    correlativo_inicio: Number(form.inicio),
    correlativo_fin: Number(form.fin),
    estado: form.activa,
  };
}

/** Solo los campos que cambiaron: tras emitir, el backend rechaza tocar tipo, serie o inicio. */
export function toActualizarSerieRequest(
  original: SerieComprobante,
  form: SerieForm,
): ActualizarSerieRequestDto {
  const cambios: ActualizarSerieRequestDto = {};
  const codigo = form.serie.trim().toUpperCase();

  if (form.tipo !== original.tipo) cambios.tipo = form.tipo;
  if (codigo !== original.codigo) cambios.serie = codigo;
  if (Number(form.inicio) !== original.inicio) cambios.correlativo_inicio = Number(form.inicio);
  if (Number(form.fin) !== original.fin) cambios.correlativo_fin = Number(form.fin);

  return cambios;
}
