import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PageDto, PedidoResumenDto } from '../../mis-pedidos/interfaces/pedido-dto.interface';
import { PedidoHistorial } from '../interfaces/pedido-historial.interface';
import { masReciente, toPedidoHistorial } from '../mappers/pedido-historial.mapper';

const PEDIDOS_BASE = `${environment.apiUrl}/pedidos`;
// Máximo que acepta la API por página.
const LIMITE_MAXIMO = 100;

/** Consulta, de solo lectura, los pedidos de un cliente (HU-A-006). */
@Injectable({ providedIn: 'root' })
export class ClientePedidosService {
  private http = inject(HttpClient);

  /** Pedidos finalizados (entregados) del cliente, del más reciente al más antiguo. */
  historial(clienteId: string): Observable<PedidoHistorial[]> {
    const params = { cliente_id: clienteId, estado: 'entregado', page: 1, limit: LIMITE_MAXIMO };

    return this.http
      .get<PageDto<PedidoResumenDto>>(PEDIDOS_BASE, { params })
      .pipe(map((pagina) => pagina.data.map(toPedidoHistorial).sort(masReciente)));
  }
}
