import {
  CrearLoteProductoTerminadoRequestDto,
  LoteProductoTerminadoDto,
  LotesProductoTerminadoPageDto,
} from '../interfaces/lote-producto-terminado-dto.interface';
import {
  LoteProductoTerminado,
  LoteProductoTerminadoForm,
  LotesProductoTerminadoPagina,
} from '../interfaces/lote-producto-terminado.interface';

export function toLoteProductoTerminado(dto: LoteProductoTerminadoDto): LoteProductoTerminado {
  return {
    id: dto.id,
    productoTerminadoId: dto.producto_terminado_id,
    sku: dto.sku,
    productoNombre: dto.producto_nombre,
    presentacionCantidad: dto.presentacion_cantidad,
    presentacionUnidadMedida: dto.presentacion_unidad_medida,
    codigoLote: dto.codigo_lote,
    fechaProduccion: dto.fecha_produccion,
    fechaVencimiento: dto.fecha_vencimiento,
    cantidadInicial: dto.cantidad_inicial,
    cantidadActual: dto.cantidad_actual,
    estado: dto.estado,
    activo: dto.activo,
  };
}

export function toLotesProductoTerminadoPagina(
  pageDto: LotesProductoTerminadoPageDto,
): LotesProductoTerminadoPagina {
  return {
    lotes: pageDto.data.map(toLoteProductoTerminado),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

export function toCrearLoteProductoTerminadoRequest(
  form: LoteProductoTerminadoForm,
): CrearLoteProductoTerminadoRequestDto {
  return {
    producto_terminado_id: Number(form.productoTerminadoId),
    codigo_lote: form.codigoLote,
    fecha_produccion: form.fechaProduccion,
    // Opcional: no se manda si no se cargo (confirmado por el backend que
    // el campo acepta omitirse).
    ...(form.fechaVencimiento ? { fecha_vencimiento: form.fechaVencimiento } : {}),
    cantidad_inicial: Number(form.cantidadInicial),
    ...(form.solicitudProduccionId
      ? { solicitud_produccion_id: Number(form.solicitudProduccionId) }
      : {}),
  };
}

// Codigo de lote FR-LT-[000]-[YYMMDD]-{sku sin el prefijo "FR-"} — pedido
// explicito del usuario: usar el SKU de la presentacion (lo que la persona
// ya ve en el selector, ej. "FR-P26-PR3") en vez del id interno de
// producto_terminado, que no significa nada en pantalla. El "FR-" se
// recorta porque ya lo pone el codigo de lote (quedaria duplicado).
export function construirCodigoLote(secuencial: number, sku: string, fecha = new Date()): string {
  const secuencialTexto = String(secuencial).padStart(3, '0');
  const anio = String(fecha.getFullYear()).slice(-2);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const skuSinPrefijo = sku.replace(/^FR-/i, '');
  return `FR-LT-${secuencialTexto}-${anio}${mes}${dia}-${skuSinPrefijo}`;
}

// YYYY-MM-DD en hora local, no UTC.
function fechaIsoLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

const PATRON_SECUENCIAL_CODIGO_LOTE = /^FR-LT-(\d+)-\d{6}-.+$/;

export interface LoteExistente {
  codigoLote: string;
  fechaProduccion: string;
}

// El proximo secuencial sale del MAXIMO ya usado en los codigos de HOY (se
// reinicia por dia) — mismo criterio que siguienteSecuencialLote de
// lote-insumo.mapper.ts. Codigos que no siguen el patron (datos
// legados/semilla) se ignoran.
export function siguienteSecuencialLote(lotes: LoteExistente[], hoy = new Date()): number {
  const hoyIso = fechaIsoLocal(hoy);
  const codigosDeHoy = lotes
    .filter((lote) => lote.fechaProduccion.slice(0, 10) === hoyIso)
    .map((lote) => lote.codigoLote);

  const maximo = codigosDeHoy.reduce((max, codigo) => {
    const match = codigo.match(PATRON_SECUENCIAL_CODIGO_LOTE);
    const secuencial = match ? Number(match[1]) : 0;
    return Math.max(max, secuencial);
  }, 0);
  return maximo + 1;
}
