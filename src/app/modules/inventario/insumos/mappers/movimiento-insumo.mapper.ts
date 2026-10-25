import {
  MovimientoInsumoDto,
  MovimientosInsumoPageDto,
} from '../interfaces/movimiento-insumo-dto.interface';
import { MovimientoInsumo, MovimientosInsumoPagina } from '../interfaces/movimiento-insumo.interface';

export function toMovimientoInsumo(dto: MovimientoInsumoDto): MovimientoInsumo {
  return {
    id: dto.id,
    codigo: dto.codigo,
    loteInsumoId: dto.lote_insumo_id,
    codigoLote: dto.codigo_lote,
    insumoId: dto.insumo_id,
    insumoNombre: dto.insumo_nombre,
    insumoSku: dto.insumo_sku,
    insumoUnidadMedida: dto.insumo_unidad_medida,
    tipo: dto.tipo,
    cantidad: dto.cantidad,
    stockAnterior: dto.stock_anterior,
    stockResultante: dto.stock_resultante,
    razon: dto.razon,
    fecha: dto.fecha,
  };
}

export function toMovimientosInsumoPagina(pageDto: MovimientosInsumoPageDto): MovimientosInsumoPagina {
  return {
    movimientos: pageDto.data.map(toMovimientoInsumo),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}
