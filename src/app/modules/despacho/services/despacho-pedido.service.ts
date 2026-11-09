import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DespachoPedidoDetalleDto,
  DespachoPedidosPageDto,
} from '../interfaces/despacho-pedido-dto.interface';
import {
  DespachoPedidoDetalle,
  DespachoPedidosPagina,
  EstadoDespacho,
  ResumenDespacho,
} from '../interfaces/despacho-pedido.interface';
import {
  toDespachoPedidoDetalle,
  toDespachoPedidosPagina,
} from '../mappers/despacho-pedido.mapper';

const DESPACHO_BASE = `${environment.apiUrl}/despacho/pedidos`;

export interface FiltrosDespacho {
  estado?: EstadoDespacho;
}

@Injectable({ providedIn: 'root' })
export class DespachoPedidoService {
  private http = inject(HttpClient);

  // El backend solo filtra por estado (RF-A094) y devuelve los pedidos en
  // orden de llegada; no hay búsqueda por texto ni por fecha.
  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosDespacho = {},
  ): Observable<DespachoPedidosPagina> {
    const params: Record<string, string | number> = { page: pagina, limit: limite };
    if (filtros.estado) params['estado'] = filtros.estado;

    return this.http
      .get<DespachoPedidosPageDto>(DESPACHO_BASE, { params })
      .pipe(map(toDespachoPedidosPagina));
  }

  // No hay un endpoint de indicadores: el total de cada estado sale del meta
  // de un listado de una sola fila, que es el dato real del backend.
  resumen(): Observable<ResumenDespacho> {
    const total = (estado: EstadoDespacho) =>
      this.listar(1, 1, { estado }).pipe(map((pagina) => pagina.total));

    return forkJoin({
      pendienteEntrega: total('pendiente_entrega'),
      enCamino: total('en_camino'),
      entregado: total('entregado'),
    });
  }

  obtener(id: number): Observable<DespachoPedidoDetalle> {
    return this.http
      .get<DespachoPedidoDetalleDto>(`${DESPACHO_BASE}/${id}`)
      .pipe(map(toDespachoPedidoDetalle));
  }

  // Ambos PATCH devuelven el pedido completo ya actualizado, con el mismo
  // shape que obtener(): se reutiliza el mapper y no se vuelve a pedir.
  // 409 = el pedido no estaba en el estado esperado; no cambia nada.
  marcarEnCamino(id: number): Observable<DespachoPedidoDetalle> {
    return this.http
      .patch<DespachoPedidoDetalleDto>(`${DESPACHO_BASE}/${id}/en-camino`, {})
      .pipe(map(toDespachoPedidoDetalle));
  }

  marcarEntregado(id: number): Observable<DespachoPedidoDetalle> {
    return this.http
      .patch<DespachoPedidoDetalleDto>(`${DESPACHO_BASE}/${id}/entregado`, {})
      .pipe(map(toDespachoPedidoDetalle));
  }
}
