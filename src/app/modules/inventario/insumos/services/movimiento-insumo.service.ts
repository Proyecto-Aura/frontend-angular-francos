import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CrearMovimientoEntradaItemDto,
  CrearMovimientoSalidaItemDto,
  MovimientoInsumoDto,
  MovimientosInsumoPageDto,
} from '../interfaces/movimiento-insumo-dto.interface';
import {
  MovimientoInsumo,
  MovimientosInsumoPagina,
  TipoMovimientoInsumoHistorial,
} from '../interfaces/movimiento-insumo.interface';
import { toMovimientoInsumo, toMovimientosInsumoPagina } from '../mappers/movimiento-insumo.mapper';

const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-insumo`;

export interface FiltrosMovimientosInsumo {
  // Texto libre contra nombre o sku del insumo (confirmado por el backend,
  // mismo criterio que /insumos) — se puede combinar con el resto.
  search?: string;
  insumoId?: number;
  loteInsumoId?: number;
  tipo?: TipoMovimientoInsumoHistorial;
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class MovimientoInsumoService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosMovimientosInsumo = {},
  ): Observable<MovimientosInsumoPagina> {
    const params: Record<string, string | number> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.insumoId !== undefined) params['insumo_id'] = filtros.insumoId;
    if (filtros.loteInsumoId !== undefined) params['lote_insumo_id'] = filtros.loteInsumoId;
    if (filtros.tipo) params['tipo'] = filtros.tipo;
    if (filtros.fechaDesde) params['fecha_desde'] = filtros.fechaDesde;
    if (filtros.fechaHasta) params['fecha_hasta'] = filtros.fechaHasta;

    return this.http
      .get<MovimientosInsumoPageDto>(MOVIMIENTOS_BASE, { params })
      .pipe(map(toMovimientosInsumoPagina));
  }

  // Siempre manda un array (aunque sea de una sola fila): el backend lo
  // guarda todo en una sola transaccion, todo o nada (confirmado por el
  // backend) — asi no hace falta armar logica de reintento por fila en el
  // front.
  registrarEntrada(filas: CrearMovimientoEntradaItemDto[]): Observable<MovimientoInsumo[]> {
    return this.http
      .post<MovimientoInsumoDto[]>(`${MOVIMIENTOS_BASE}/entrada`, filas)
      .pipe(map((dtos) => dtos.map(toMovimientoInsumo)));
  }

  registrarSalida(filas: CrearMovimientoSalidaItemDto[]): Observable<MovimientoInsumo[]> {
    return this.http
      .post<MovimientoInsumoDto[]>(`${MOVIMIENTOS_BASE}/salida`, filas)
      .pipe(map((dtos) => dtos.map(toMovimientoInsumo)));
  }

  // Mismo shape que entrada (confirmado por el backend) — la diferencia es
  // que aca "cantidad" viaja con signo (+/-), un delta ya calculado por el
  // front contra el stock actual del lote, no la cantidad real que tipeo la
  // persona (ver movimiento-form-modal.ts).
  registrarAjuste(filas: CrearMovimientoEntradaItemDto[]): Observable<MovimientoInsumo[]> {
    return this.http
      .post<MovimientoInsumoDto[]>(`${MOVIMIENTOS_BASE}/ajuste`, filas)
      .pipe(map((dtos) => dtos.map(toMovimientoInsumo)));
  }
}
