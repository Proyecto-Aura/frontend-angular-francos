import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SolicitudesProduccionOpcionPageDto } from '../interfaces/solicitud-produccion-opcion-dto.interface';
import { SolicitudProduccionOpcion } from '../interfaces/solicitud-produccion-opcion.interface';
import { toSolicitudesProduccionOpcionLista } from '../mappers/solicitud-produccion-opcion.mapper';

const SOLICITUDES_PRODUCCION_BASE = `${environment.apiUrl}/produccion/solicitudes`;

export interface FiltrosSolicitudesProduccionOpcion {
  estado?: 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';
}

// Solo lo que necesita el buscador de "Solicitud de producción" en el form
// de "Nueva solicitud de insumos" — listar() nada mas, sin indicadores ni
// alta/edicion (eso sigue siendo exclusivo del modulo solicitudes-produccion).
@Injectable({ providedIn: 'root' })
export class SolicitudProduccionOpcionService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 100,
    filtros: FiltrosSolicitudesProduccionOpcion = {},
  ): Observable<SolicitudProduccionOpcion[]> {
    const params: Record<string, string | number> = { page: pagina, limit: limite };
    if (filtros.estado) params['estado'] = filtros.estado;

    return this.http
      .get<SolicitudesProduccionOpcionPageDto>(SOLICITUDES_PRODUCCION_BASE, { params })
      .pipe(map(toSolicitudesProduccionOpcionLista));
  }
}
