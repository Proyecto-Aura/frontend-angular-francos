import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { SeguimientoKpisDto } from '../../negocio/interfaces/seguimiento-kpis-dto.interface';
import { SeguimientoKpis } from '../../negocio/interfaces/seguimiento-kpis.interface';
import { toSeguimientoKpis } from '../../negocio/mappers/seguimiento-kpis.mapper';

@Injectable({ providedIn: 'root' })
export class SeguimientoKpisTiService {
  private http = inject(HttpClient);

  obtener(planId: number): Observable<SeguimientoKpis> {
    return this.http
      .get<SeguimientoKpisDto>(
        `${environment.apiUrl}/planes-estrategicos/${planId}/seguimiento-kpis-ti`,
      )
      .pipe(map(toSeguimientoKpis));
  }
}
