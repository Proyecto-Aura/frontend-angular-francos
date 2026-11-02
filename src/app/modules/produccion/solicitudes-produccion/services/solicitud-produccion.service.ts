import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CambiarEstadoSolicitudProduccionRequestDto,
  IndicadoresSolicitudesProduccionDto,
  SolicitudProduccionDto,
  SolicitudesProduccionPageDto,
} from '../interfaces/solicitud-produccion-dto.interface';
import {
  EstadoSolicitudProduccion,
  ResumenSolicitudesProduccion,
  SolicitudProduccion,
  SolicitudesProduccionPagina,
} from '../interfaces/solicitud-produccion.interface';
import {
  toResumenSolicitudesProduccion,
  toSolicitudProduccion,
  toSolicitudesProduccionPagina,
} from '../mappers/solicitud-produccion.mapper';

const SOLICITUDES_BASE = `${environment.apiUrl}/solicitudes-produccion`;

export interface FiltrosSolicitudesProduccion {
  search?: string;
  estado?: EstadoSolicitudProduccion;
  fechaDesde?: string;
  fechaHasta?: string;
}

// Mismo endpoint que ya consume Inventario (OFT0-261) — el rol "produccion"
// ya esta habilitado del lado del backend para los 4 metodos de abajo
// (confirmado por el backend, OFT0-263). Esta vista no crea ni edita
// solicitudes (eso sigue siendo exclusivo de Inventario), solo lista y
// cambia el estado.
@Injectable({ providedIn: 'root' })
export class SolicitudProduccionService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosSolicitudesProduccion = {},
  ): Observable<SolicitudesProduccionPagina> {
    const params: Record<string, string | number> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.estado) params['estado'] = filtros.estado;
    if (filtros.fechaDesde) params['fecha_desde'] = filtros.fechaDesde;
    if (filtros.fechaHasta) params['fecha_hasta'] = filtros.fechaHasta;

    return this.http
      .get<SolicitudesProduccionPageDto>(SOLICITUDES_BASE, { params })
      .pipe(map(toSolicitudesProduccionPagina));
  }

  indicadores(): Observable<ResumenSolicitudesProduccion> {
    return this.http
      .get<IndicadoresSolicitudesProduccionDto>(`${SOLICITUDES_BASE}/indicadores`)
      .pipe(map(toResumenSolicitudesProduccion));
  }

  // GET /solicitudes-produccion/:id — SI trae el detalle embebido siempre
  // (confirmado por el backend), a diferencia del listado.
  obtener(id: number): Observable<SolicitudProduccion> {
    return this.http
      .get<SolicitudProduccionDto>(`${SOLICITUDES_BASE}/${id}`)
      .pipe(map(toSolicitudProduccion));
  }

  // Se ignora el body de la respuesta (mismo criterio que cancelar() en
  // Inventario): el caller siempre vuelve a pedir la lista completa despues.
  cambiarEstado(id: number, estado: EstadoSolicitudProduccion): Observable<void> {
    const body: CambiarEstadoSolicitudProduccionRequestDto = { estado };
    return this.http
      .patch<unknown>(`${SOLICITUDES_BASE}/${id}/estado`, body)
      .pipe(map(() => undefined));
  }
}
