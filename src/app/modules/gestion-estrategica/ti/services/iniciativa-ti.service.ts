import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarEstadoIniciativaRequestDto,
  IniciativaDto,
} from '../../negocio/interfaces/iniciativa-dto.interface';
import {
  EstadoIniciativaCodigo,
  Iniciativa,
  IniciativaForm,
} from '../../negocio/interfaces/iniciativa.interface';
import {
  toActualizarIniciativaRequest,
  toCrearIniciativaRequest,
  toIniciativa,
  toIniciativas,
} from '../../negocio/mappers/iniciativa.mapper';

@Injectable({ providedIn: 'root' })
export class IniciativaTiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/iniciativas-ti`;

  listarPorPlan(planId: number): Observable<Iniciativa[]> {
    return this.http
      .get<IniciativaDto[]>(`${environment.apiUrl}/planes-estrategicos/${planId}/iniciativas-ti`)
      .pipe(map(toIniciativas));
  }

  crear(form: IniciativaForm): Observable<Iniciativa> {
    return this.http
      .post<IniciativaDto>(this.baseUrl, toCrearIniciativaRequest(form))
      .pipe(map(toIniciativa));
  }

  actualizar(id: number, form: IniciativaForm): Observable<Iniciativa> {
    return this.http
      .patch<IniciativaDto>(`${this.baseUrl}/${id}`, toActualizarIniciativaRequest(form))
      .pipe(map(toIniciativa));
  }

  cambiarEstado(
    id: number,
    estadoCodigo: EstadoIniciativaCodigo,
    motivo?: string,
  ): Observable<Iniciativa> {
    const body: ActualizarEstadoIniciativaRequestDto = {
      estado_codigo: estadoCodigo as ActualizarEstadoIniciativaRequestDto['estado_codigo'],
    };
    if (estadoCodigo === 'CANCELADA') body.motivo_cancelacion = motivo?.trim() ?? '';
    return this.http
      .patch<IniciativaDto>(`${this.baseUrl}/${id}/estado`, body)
      .pipe(map(toIniciativa));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
