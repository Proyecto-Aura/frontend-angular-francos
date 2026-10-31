import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarCantidadDetalleSolicitudProduccionRequestDto,
  ActualizarFechaLimiteSolicitudProduccionRequestDto,
  CambiarEstadoSolicitudProduccionRequestDto,
  CrearDetalleSolicitudProduccionItemDto,
  CrearSolicitudProduccionRequestDto,
  IndicadoresSolicitudesProduccionDto,
  SolicitudProduccionDto,
  SolicitudesProduccionPageDto,
} from '../interfaces/solicitud-produccion-dto.interface';
import {
  EstadoSolicitudProduccion,
  ResumenSolicitudesProduccion,
  SolicitudProduccion,
  SolicitudProduccionForm,
  SolicitudesProduccionPagina,
} from '../interfaces/solicitud-produccion.interface';
import {
  siguienteSecuencialSolicitud,
  toCrearSolicitudProduccionRequest,
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

  // Proximo secuencial de codigo de solicitud: se calcula a partir del
  // MAXIMO numero ya usado en los codigos de HOY (se reinicia por dia, ver
  // siguienteSecuencialSolicitud en el mapper) — mismo criterio que
  // LoteInsumoService.siguienteSecuencial(). El string final
  // (FR-SPR-[seq]-[YYMMDD]) lo arma el caller via construirCodigoSolicitud(),
  // no este servicio. No se filtra por fecha contra el backend (la
  // semantica exacta de fecha_desde/fecha_hasta — si filtran fecha_creacion
  // o fecha_limite — no esta confirmada): se trae una pagina razonable de
  // orden reciente y se filtra por fecha_creacion del lado del front, que
  // si esta confirmado.
  siguienteSecuencial(): Observable<number> {
    return this.http
      .get<SolicitudesProduccionPageDto>(SOLICITUDES_BASE, { params: { page: 1, limit: 100 } })
      .pipe(
        map((pageDto) =>
          siguienteSecuencialSolicitud(
            pageDto.data.map((dto) => ({ codigo: dto.codigo, fechaCreacion: dto.fecha_creacion })),
          ),
        ),
      );
  }

  // Reemplaza el workaround de 4 pedidos en paralelo por estado (limit=1)
  // que se usaba antes de que el backend tuviera este endpoint — pedido
  // explicito del usuario apenas estuvo disponible.
  indicadores(): Observable<ResumenSolicitudesProduccion> {
    return this.http
      .get<IndicadoresSolicitudesProduccionDto>(`${SOLICITUDES_BASE}/indicadores`)
      .pipe(map(toResumenSolicitudesProduccion));
  }

  registrar(codigo: string, form: SolicitudProduccionForm): Observable<SolicitudProduccion> {
    const body: CrearSolicitudProduccionRequestDto = toCrearSolicitudProduccionRequest(
      codigo,
      form,
    );
    return this.http
      .post<SolicitudProduccionDto>(SOLICITUDES_BASE, body)
      .pipe(map(toSolicitudProduccion));
  }

  // GET /solicitudes-produccion/:id — a diferencia del listado, SI trae el
  // detalle embebido siempre (confirmado por el backend, ver el comentario
  // de "detalle" en SolicitudProduccionDto).
  obtener(id: number): Observable<SolicitudProduccion> {
    return this.http
      .get<SolicitudProduccionDto>(`${SOLICITUDES_BASE}/${id}`)
      .pipe(map(toSolicitudProduccion));
  }

  cancelar(id: number): Observable<void> {
    const body: CambiarEstadoSolicitudProduccionRequestDto = { estado: 'rechazado' };
    return this.http
      .patch<unknown>(`${SOLICITUDES_BASE}/${id}/estado`, body)
      .pipe(map(() => undefined));
  }

  // --- Edicion (OFT0-261, confirmado por el backend): solo mientras la
  // solicitud esta pendiente (409 si no). Se ignora el body de la
  // respuesta en los 4 metodos (mismo criterio que actualizarStock() de
  // ProductoPresentacionService): el caller siempre vuelve a pedir
  // obtener(id) despues de aplicar los cambios, asi que no hace falta
  // mapear un shape que ademas puede no traer "detalle" (ver el comentario
  // en SolicitudProduccionDto).
  actualizarFechaLimite(id: number, fechaLimite: string): Observable<void> {
    const body: ActualizarFechaLimiteSolicitudProduccionRequestDto = { fecha_limite: fechaLimite };
    return this.http.patch<unknown>(`${SOLICITUDES_BASE}/${id}`, body).pipe(map(() => undefined));
  }

  agregarDetalle(id: number, item: CrearDetalleSolicitudProduccionItemDto): Observable<void> {
    return this.http
      .post<unknown>(`${SOLICITUDES_BASE}/${id}/detalle`, item)
      .pipe(map(() => undefined));
  }

  actualizarCantidadDetalle(detalleId: number, cantidadSolicitada: number): Observable<void> {
    const body: ActualizarCantidadDetalleSolicitudProduccionRequestDto = {
      cantidad_solicitada: cantidadSolicitada,
    };
    return this.http
      .patch<unknown>(`${SOLICITUDES_BASE}/detalle/${detalleId}`, body)
      .pipe(map(() => undefined));
  }

  eliminarDetalle(detalleId: number): Observable<void> {
    return this.http
      .delete<unknown>(`${SOLICITUDES_BASE}/detalle/${detalleId}`)
      .pipe(map(() => undefined));
  }
}
