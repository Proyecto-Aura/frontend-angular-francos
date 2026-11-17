import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CrearMovimientoProductoTerminadoLoteItemDto,
  CrearMovimientoProductoTerminadoSalidaItemDto,
  MovimientoProductoTerminadoDto,
  MovimientosProductoTerminadoPageDto,
} from '../interfaces/movimiento-producto-terminado-dto.interface';
import {
  MovimientoProductoTerminado,
  MovimientosProductoTerminadoPagina,
  TipoMovimientoProductoTerminadoHistorial,
} from '../interfaces/movimiento-producto-terminado.interface';
import {
  toMovimientoProductoTerminado,
  toMovimientosProductoTerminadoPagina,
} from '../mappers/movimiento-producto-terminado.mapper';

const MOVIMIENTOS_BASE = `${environment.apiUrl}/movimientos-producto-terminado`;

export interface FiltrosMovimientosProductoTerminado {
  search?: string;
  productoTerminadoId?: number;
  loteProductoTerminadoId?: number;
  tipo?: TipoMovimientoProductoTerminadoHistorial;
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class MovimientoProductoTerminadoService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosMovimientosProductoTerminado = {},
  ): Observable<MovimientosProductoTerminadoPagina> {
    const params: Record<string, string | number> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.productoTerminadoId !== undefined) {
      params['producto_terminado_id'] = filtros.productoTerminadoId;
    }
    if (filtros.loteProductoTerminadoId !== undefined) {
      params['lote_producto_terminado_id'] = filtros.loteProductoTerminadoId;
    }
    if (filtros.tipo) params['tipo'] = filtros.tipo;
    if (filtros.fechaDesde) params['fecha_desde'] = filtros.fechaDesde;
    if (filtros.fechaHasta) params['fecha_hasta'] = filtros.fechaHasta;

    return this.http
      .get<MovimientosProductoTerminadoPageDto>(MOVIMIENTOS_BASE, { params })
      .pipe(map(toMovimientosProductoTerminadoPagina));
  }

  // Siempre manda un array (aunque sea de una sola fila): el backend lo
  // guarda todo en una sola transaccion, todo o nada (confirmado por el
  // backend, mismo criterio que movimientos-insumo).
  registrarEntrada(
    filas: CrearMovimientoProductoTerminadoLoteItemDto[],
  ): Observable<MovimientoProductoTerminado[]> {
    return this.http
      .post<MovimientoProductoTerminadoDto[]>(`${MOVIMIENTOS_BASE}/entrada`, filas)
      .pipe(map((dtos) => dtos.map(toMovimientoProductoTerminado)));
  }

  registrarSalida(
    filas: CrearMovimientoProductoTerminadoSalidaItemDto[],
  ): Observable<MovimientoProductoTerminado[]> {
    return this.http
      .post<MovimientoProductoTerminadoDto[]>(`${MOVIMIENTOS_BASE}/salida`, filas)
      .pipe(map((dtos) => dtos.map(toMovimientoProductoTerminado)));
  }

  // Mismo shape que entrada (confirmado por el backend) — la diferencia es
  // que aca "cantidad" viaja con signo (+/-), un delta ya calculado por el
  // front contra el stock actual del lote, no la cantidad real que tipeo la
  // persona (ver movimiento-producto-terminado-form-modal.ts).
  registrarAjuste(
    filas: CrearMovimientoProductoTerminadoLoteItemDto[],
  ): Observable<MovimientoProductoTerminado[]> {
    return this.http
      .post<MovimientoProductoTerminadoDto[]>(`${MOVIMIENTOS_BASE}/ajuste`, filas)
      .pipe(map((dtos) => dtos.map(toMovimientoProductoTerminado)));
  }
}
