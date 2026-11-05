import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarCantidadDetalleSolicitudInsumoRequestDto,
  ActualizarFechaLimiteSolicitudInsumoRequestDto,
  CambiarEstadoSolicitudInsumoRequestDto,
  CrearDetalleSolicitudInsumoItemDto,
  CrearSolicitudInsumoRequestDto,
  IndicadoresSolicitudesInsumoDto,
  SolicitudInsumoDto,
  SolicitudesInsumoPageDto,
} from '../interfaces/solicitud-insumo-dto.interface';
import {
  EstadoSolicitudInsumo,
  ResumenSolicitudesInsumo,
  SolicitudInsumo,
  SolicitudInsumoForm,
  SolicitudesInsumoPagina,
} from '../interfaces/solicitud-insumo.interface';
import {
  siguienteSecuencialSolicitudInsumo,
  toCrearSolicitudInsumoRequest,
  toResumenSolicitudesInsumo,
  toSolicitudInsumo,
  toSolicitudesInsumoPagina,
} from '../mappers/solicitud-insumo.mapper';

const SOLICITUDES_BASE = `${environment.apiUrl}/produccion/solicitudes-insumos`;

// YYYY-MM-DD en hora local del navegador, no UTC — se manda tal cual como
// fecha_desde/fecha_hasta a GET .../solicitudes-insumos, que el backend
// resuelve en zona Lima (confirmado por el backend) para traer solo las
// solicitudes de "hoy". Mas confiable que pedir una pagina de solicitudes
// recientes y comparar fecha_creacion contra la fecha local en el cliente
// (bug real encontrado por el backend: fecha_creacion se guardaba con la
// fecha UTC del server, no la de Lima, asi que esa comparacion podia nunca
// encontrar la solicitud recien creada — ver el comentario de
// siguienteSecuencialSolicitudInsumo en el mapper).
function fechaIsoLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export interface FiltrosSolicitudesInsumo {
  search?: string;
  estado?: EstadoSolicitudInsumo;
  fechaDesde?: string;
  fechaHasta?: string;
}

// Mismo patron que SolicitudProduccionService de Inventario (OFT0-261), con
// roles invertidos (OFT0-264, confirmado por el backend): admin/produccion
// crean y editan, admin/inventario/produccion listan y ven detalle, el
// cambio de estado (iniciar/entregar/rechazar) tambien depende del rol de
// quien llama del lado del backend.
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

  // Proximo secuencial de codigo de solicitud — le pide al backend
  // directamente las solicitudes de HOY via fecha_desde/fecha_hasta (en
  // vez de traer una pagina reciente y filtrar fecha_creacion en el
  // cliente), mismo criterio ahora en SolicitudProduccionService.
  siguienteSecuencial(): Observable<number> {
    const hoy = fechaIsoLocal(new Date());
    return this.http
      .get<SolicitudesInsumoPageDto>(SOLICITUDES_BASE, {
        params: { page: 1, limit: 100, fecha_desde: hoy, fecha_hasta: hoy },
      })
      .pipe(
        map((pageDto) =>
          siguienteSecuencialSolicitudInsumo(
            pageDto.data.map((dto) => ({ codigo: dto.codigo_solicitud })),
          ),
        ),
      );
  }

  indicadores(): Observable<ResumenSolicitudesInsumo> {
    return this.http
      .get<IndicadoresSolicitudesInsumoDto>(`${SOLICITUDES_BASE}/indicadores`)
      .pipe(map(toResumenSolicitudesInsumo));
  }

  registrar(
    codigo: string,
    form: SolicitudInsumoForm,
    solicitudProduccionId?: number,
  ): Observable<SolicitudInsumo> {
    const body: CrearSolicitudInsumoRequestDto = toCrearSolicitudInsumoRequest(
      codigo,
      form,
      solicitudProduccionId,
    );
    return this.http.post<SolicitudInsumoDto>(SOLICITUDES_BASE, body).pipe(map(toSolicitudInsumo));
  }

  obtener(id: number): Observable<SolicitudInsumo> {
    return this.http
      .get<SolicitudInsumoDto>(`${SOLICITUDES_BASE}/${id}`)
      .pipe(map(toSolicitudInsumo));
  }

  cambiarEstado(id: number, estado: EstadoSolicitudInsumo): Observable<void> {
    const body: CambiarEstadoSolicitudInsumoRequestDto = { estado };
    return this.http
      .patch<unknown>(`${SOLICITUDES_BASE}/${id}/estado`, body)
      .pipe(map(() => undefined));
  }

  cancelar(id: number): Observable<void> {
    return this.cambiarEstado(id, 'rechazado');
  }

  actualizarFechaLimite(id: number, fechaLimite: string): Observable<void> {
    const body: ActualizarFechaLimiteSolicitudInsumoRequestDto = { fecha_limite: fechaLimite };
    return this.http.patch<unknown>(`${SOLICITUDES_BASE}/${id}`, body).pipe(map(() => undefined));
  }

  agregarDetalle(id: number, item: CrearDetalleSolicitudInsumoItemDto): Observable<void> {
    return this.http
      .post<unknown>(`${SOLICITUDES_BASE}/${id}/detalle`, item)
      .pipe(map(() => undefined));
  }

  actualizarCantidadDetalle(detalleId: number, cantidadSolicitada: number): Observable<void> {
    const body: ActualizarCantidadDetalleSolicitudInsumoRequestDto = {
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
