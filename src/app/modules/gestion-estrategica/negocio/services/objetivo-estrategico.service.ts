import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ObjetivoEstrategicoDto,
  PerspectivaBscDto,
  ResumenObjetivosPlanDto,
} from '../interfaces/objetivo-estrategico-dto.interface';
import {
  EstadoObjetivoCodigo,
  ObjetivoEstrategico,
  ObjetivoEstrategicoForm,
  PerspectivaBsc,
} from '../interfaces/objetivo-estrategico.interface';
import {
  toActualizarObjetivoRequest,
  toCrearObjetivoRequest,
  toObjetivoEstrategico,
  toObjetivosDeResumen,
  toPerspectivaBsc,
} from '../mappers/objetivo-estrategico.mapper';

@Injectable({ providedIn: 'root' })
export class ObjetivoEstrategicoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/objetivos-estrategicos`;

  listarPerspectivas(): Observable<PerspectivaBsc[]> {
    return this.http
      .get<PerspectivaBscDto[]>(`${environment.apiUrl}/perspectivas-bsc`)
      .pipe(map((perspectivas) => perspectivas.map(toPerspectivaBsc)));
  }

  listarPorPlan(planId: number): Observable<ObjetivoEstrategico[]> {
    return this.http
      .get<ResumenObjetivosPlanDto>(
        `${environment.apiUrl}/planes-estrategicos/${planId}/objetivos-estrategicos`,
      )
      .pipe(map(toObjetivosDeResumen));
  }

  registrar(planId: number, form: ObjetivoEstrategicoForm): Observable<ObjetivoEstrategico> {
    return this.http
      .post<ObjetivoEstrategicoDto>(this.baseUrl, toCrearObjetivoRequest(planId, form))
      .pipe(map(toObjetivoEstrategico));
  }

  actualizar(id: number, form: ObjetivoEstrategicoForm): Observable<ObjetivoEstrategico> {
    return this.http
      .patch<ObjetivoEstrategicoDto>(`${this.baseUrl}/${id}`, toActualizarObjetivoRequest(form))
      .pipe(map(toObjetivoEstrategico));
  }

  cambiarEstado(id: number, estadoCodigo: EstadoObjetivoCodigo): Observable<ObjetivoEstrategico> {
    return this.http
      .patch<ObjetivoEstrategicoDto>(`${this.baseUrl}/${id}/estado`, {
        estado_codigo: estadoCodigo,
      })
      .pipe(map(toObjetivoEstrategico));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
