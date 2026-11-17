import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EstadoObjetivoCodigo } from '../../negocio/interfaces/objetivo-estrategico.interface';
import {
  ObjetivoEstrategicoTiDto,
  ResumenObjetivosTiPlanDto,
} from '../interfaces/objetivo-estrategico-ti-dto.interface';
import {
  ObjetivoEstrategicoTi,
  ObjetivoEstrategicoTiForm,
} from '../interfaces/objetivo-estrategico-ti.interface';
import {
  toActualizarObjetivoTiRequest,
  toCrearObjetivoTiRequest,
  toObjetivoEstrategicoTi,
  toObjetivosTiDeResumen,
} from '../mappers/objetivo-estrategico-ti.mapper';

@Injectable({ providedIn: 'root' })
export class ObjetivoEstrategicoTiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/objetivos-estrategicos-ti`;

  listarPorPlan(planId: number): Observable<ObjetivoEstrategicoTi[]> {
    return this.http
      .get<ResumenObjetivosTiPlanDto>(
        `${environment.apiUrl}/planes-estrategicos/${planId}/objetivos-estrategicos-ti`,
      )
      .pipe(map(toObjetivosTiDeResumen));
  }

  registrar(planId: number, form: ObjetivoEstrategicoTiForm): Observable<ObjetivoEstrategicoTi> {
    return this.http
      .post<ObjetivoEstrategicoTiDto>(this.baseUrl, toCrearObjetivoTiRequest(planId, form))
      .pipe(map(toObjetivoEstrategicoTi));
  }

  actualizar(id: number, form: ObjetivoEstrategicoTiForm): Observable<ObjetivoEstrategicoTi> {
    return this.http
      .patch<ObjetivoEstrategicoTiDto>(`${this.baseUrl}/${id}`, toActualizarObjetivoTiRequest(form))
      .pipe(map(toObjetivoEstrategicoTi));
  }

  cambiarEstado(id: number, estadoCodigo: EstadoObjetivoCodigo): Observable<ObjetivoEstrategicoTi> {
    return this.http
      .patch<ObjetivoEstrategicoTiDto>(`${this.baseUrl}/${id}/estado`, {
        estado_codigo: estadoCodigo,
      })
      .pipe(map(toObjetivoEstrategicoTi));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
