import {
  CrearLoteInsumoRequestDto,
  LoteInsumoDto,
  LotesInsumoPageDto,
} from '../interfaces/lote-insumo-dto.interface';
import { LoteInsumo, LoteInsumoForm, LotesInsumoPagina } from '../interfaces/lote-insumo.interface';

export function toLoteInsumo(dto: LoteInsumoDto): LoteInsumo {
  return {
    id: dto.id,
    insumoId: dto.insumo_id,
    codigoLote: dto.codigo_lote,
    fechaIngreso: dto.fecha_ingreso,
    fechaVencimiento: dto.fecha_vencimiento,
    cantidadInicial: dto.cantidad_inicial,
    cantidadActual: dto.cantidad_actual,
    estado: dto.estado,
    activo: dto.activo,
  };
}

export function toLotesInsumoPagina(pageDto: LotesInsumoPageDto): LotesInsumoPagina {
  return {
    lotes: pageDto.data.map(toLoteInsumo),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

export function toCrearLoteInsumoRequest(form: LoteInsumoForm): CrearLoteInsumoRequestDto {
  return {
    insumo_id: Number(form.insumoId),
    codigo_lote: form.codigoLote,
    fecha_ingreso: form.fechaIngreso,
    // Opcional: no se manda si no aplica (insumos tipo empaque, que no
    // vencen) — confirmado con el backend que el campo acepta omitirse.
    ...(form.fechaVencimiento ? { fecha_vencimiento: form.fechaVencimiento } : {}),
    cantidad_inicial: Number(form.cantidadInicial),
  };
}

// Codigo de lote FR-LT-[000]-[YYMMDD]-INS{insumoId}: el secuencial no se
// reinicia por dia (decision confirmada con el usuario, ya que el backend
// no permite filtrar GET /lotes-insumo por fecha y combinado con la fecha
// en el propio codigo alcanza para que practicamente no se repita).
export function construirCodigoLote(
  secuencial: number,
  insumoId: number,
  fecha = new Date(),
): string {
  const secuencialTexto = String(secuencial).padStart(3, '0');
  const anio = String(fecha.getFullYear()).slice(-2);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `FR-LT-${secuencialTexto}-${anio}${mes}${dia}-INS${insumoId}`;
}

const PATRON_SECUENCIAL_CODIGO_LOTE = /^FR-LT-(\d+)-\d{6}-INS\d+$/;

// El proximo secuencial sale del MAXIMO ya usado en los codigo_lote
// existentes de ese insumo, no de "cuantas filas hay". Un simple conteo de
// filas se desincroniza apenas se borra un lote fuera de la app (baja
// fisica directo en la base): el conteo baja, pero el numero mas alto ya
// usado sigue siendo el mismo, y recalcular desde el conteo termina
// regenerando un codigo que ya existe (409 de codigo_lote duplicado).
// Codigos que no siguen nuestro patron (datos legados/semilla, ej.
// "LOTE-2026-001") se ignoran — no interfieren con esta numeracion.
export function siguienteSecuencialLote(codigosLote: string[]): number {
  const maximo = codigosLote.reduce((max, codigo) => {
    const match = codigo.match(PATRON_SECUENCIAL_CODIGO_LOTE);
    const secuencial = match ? Number(match[1]) : 0;
    return Math.max(max, secuencial);
  }, 0);
  return maximo + 1;
}
