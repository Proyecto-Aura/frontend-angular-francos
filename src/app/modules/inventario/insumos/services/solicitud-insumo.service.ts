import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CambiarEstadoSolicitudInsumoRequestDto,
  IndicadoresSolicitudesInsumoDto,
  SolicitudInsumoDto,
  SolicitudesInsumoPageDto,
} from '../interfaces/solicitud-insumo-dto.interface';
import {
  EstadoSolicitudInsumo,
  ItemEntregaSolicitudInsumo,
  ResumenSolicitudesInsumo,
  SolicitudInsumo,
  SolicitudesInsumoPagina,
} from '../interfaces/solicitud-insumo.interface';
import {
  toResumenSolicitudesInsumo,
  toSolicitudInsumo,
  toSolicitudesInsumoPagina,
} from '../mappers/solicitud-insumo.mapper';

const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;

export interface FiltrosSolicitudesInsumo {
  search?: string;
  estado?: EstadoSolicitudInsumo;
  fechaDesde?: string;
  fechaHasta?: string;
}

// Mismo endpoint que ya consume Produccion (OFT0-264) — el rol "inventario"
// ya esta habilitado del lado del backend para estos metodos (roles
// invertidos vs. solicitud de produccion). Esta vista no crea ni edita
// solicitudes (eso sigue siendo exclusivo de Produccion), solo lista y
// cambia el estado.
@Injectable({ providedIn: 'root' })
export class SolicitudInsumoService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosSolicitudesInsumo = {},
  ): Observable<SolicitudesInsumoPagina> {
    const params: Record<string, string | number> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.estado) params['estado'] = filtros.estado;
    if (filtros.fechaDesde) params['fecha_desde'] = filtros.fechaDesde;
    if (filtros.fechaHasta) params['fecha_hasta'] = filtros.fechaHasta;

    return this.http
      .get<SolicitudesInsumoPageDto>(SOLICITUDES_BASE, { params })
      .pipe(map(toSolicitudesInsumoPagina));
  }

  indicadores(): Observable<ResumenSolicitudesInsumo> {
    return this.http
      .get<IndicadoresSolicitudesInsumoDto>(`${SOLICITUDES_BASE}/indicadores`)
      .pipe(map(toResumenSolicitudesInsumo));
  }

  // GET /produccion/solicitudes-insumos/:id — SI trae el detalle embebido
  // siempre (confirmado por el backend), a diferencia del listado.
  obtener(id: number): Observable<SolicitudInsumo> {
    return this.http
      .get<SolicitudInsumoDto>(`${SOLICITUDES_BASE}/${id}`)
      .pipe(map(toSolicitudInsumo));
  }

  // Se ignora el body de la respuesta (mismo criterio que el resto del
  // modulo): el caller siempre vuelve a pedir la lista completa despues.
  // "items" es opcional y solo aplica al pasar a "entregado" (confirmado
  // por el backend, pedido explicito del usuario: columna "Cantidad
  // preparada" editable, mismo UX que Pedidos) — si se omite, el backend
  // despacha cantidad_solicitada de cada linea.
  cambiarEstado(
    id: number,
    estado: EstadoSolicitudInsumo,
    items?: ItemEntregaSolicitudInsumo[],
  ): Observable<void> {
    const body: CambiarEstadoSolicitudInsumoRequestDto = {
      estado,
      ...(items
        ? {
            items: items.map((i) => ({
              insumo_id: i.insumoId,
              cantidad_entregada: i.cantidadEntregada,
            })),
          }
        : {}),
    };
    return this.http
      .patch<unknown>(`${SOLICITUDES_BASE}/${id}/estado`, body)
      .pipe(map(() => undefined));
  }
}
