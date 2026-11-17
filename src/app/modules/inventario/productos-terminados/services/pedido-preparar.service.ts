import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  IndicadoresPedidosPorPrepararDto,
  ItemCantidadPreparadaDto,
  PedidoPrepararDetalleDto,
  PedidosPorPrepararPageDto,
} from '../interfaces/pedido-preparar-dto.interface';
import {
  EstadoPedidoPreparar,
  ItemCantidadPreparada,
  PedidoPrepararDetalle,
  PedidosPorPrepararPagina,
  ResumenPedidosPorPreparar,
} from '../interfaces/pedido-preparar.interface';
import {
  toPedidoPrepararDetalle,
  toPedidosPorPrepararPagina,
  toResumenPedidosPorPreparar,
} from '../mappers/pedido-preparar.mapper';

const PEDIDOS_PREPARAR_BASE = `${environment.apiUrl}/inventario/pedidos`;

export interface FiltrosPedidosPorPreparar {
  search?: string;
  estado?: EstadoPedidoPreparar;
  // Fecha única conservada por compatibilidad; la página usa el rango opcional.
  fecha?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class PedidoPrepararService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosPedidosPorPreparar = {},
  ): Observable<PedidosPorPrepararPagina> {
    const params: Record<string, string | number> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.estado) params['estado'] = filtros.estado;
    if (filtros.fecha) params['fecha'] = filtros.fecha;
    if (filtros.fechaDesde) params['fecha_desde'] = filtros.fechaDesde;
    if (filtros.fechaHasta) params['fecha_hasta'] = filtros.fechaHasta;

    return this.http
      .get<PedidosPorPrepararPageDto>(PEDIDOS_PREPARAR_BASE, { params })
      .pipe(map(toPedidosPorPrepararPagina));
  }

  indicadores(): Observable<ResumenPedidosPorPreparar> {
    return this.http
      .get<IndicadoresPedidosPorPrepararDto>(`${PEDIDOS_PREPARAR_BASE}/indicadores`)
      .pipe(map(toResumenPedidosPorPreparar));
  }

  obtener(id: number): Observable<PedidoPrepararDetalle> {
    return this.http
      .get<PedidoPrepararDetalleDto>(`${PEDIDOS_PREPARAR_BASE}/${id}`)
      .pipe(map(toPedidoPrepararDetalle));
  }

  // Ambos PATCH devuelven el pedido completo actualizado, con el mismo
  // shape que obtener() (confirmado por el backend) — se reusa el mismo
  // mapper en vez de volver a pedir el detalle.
  marcarEnPreparacion(id: number): Observable<PedidoPrepararDetalle> {
    return this.http
      .patch<PedidoPrepararDetalleDto>(`${PEDIDOS_PREPARAR_BASE}/${id}/en-preparacion`, {})
      .pipe(map(toPedidoPrepararDetalle));
  }

  // El body debe traer TODOS los items del pedido (incluso los que no
  // cambiaron de cantidad) — confirmado por el backend: un item faltante o
  // de mas devuelve 400, y sin stock suficiente para alguna linea, 409 sin
  // crear nada. Internamente genera un movimiento de salida por producto
  // terminado (reparto FEFO entre lotes), pero la respuesta sigue siendo
  // solo el detalle del pedido, no info de esos movimientos.
  marcarPendienteEntrega(
    id: number,
    items: ItemCantidadPreparada[],
  ): Observable<PedidoPrepararDetalle> {
    const body: { items: ItemCantidadPreparadaDto[] } = {
      items: items.map((i) => ({
        producto_presentacion_id: i.productoPresentacionId,
        cantidad_preparada: i.cantidadPreparada,
      })),
    };
    return this.http
      .patch<PedidoPrepararDetalleDto>(`${PEDIDOS_PREPARAR_BASE}/${id}/pendiente-entrega`, body)
      .pipe(map(toPedidoPrepararDetalle));
  }
}
