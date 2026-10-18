import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarEstadoIniciativaRequestDto,
  IniciativaDto,
} from '../interfaces/iniciativa-dto.interface';
import {
  EstadoIniciativaCodigo,
  Iniciativa,
  IniciativaForm,
} from '../interfaces/iniciativa.interface';
import {
  toActualizarIniciativaRequest,
  toCrearIniciativaRequest,
  toIniciativa,
  toIniciativas,
} from '../mappers/iniciativa.mapper';

@Injectable({ providedIn: 'root' })
export class IniciativaService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/iniciativas`;

  listarPorPlan(planId: number): Observable<Iniciativa[]> {
    return this.http
      .get<IniciativaDto[]>(`${environment.apiUrl}/planes-estrategicos/${planId}/iniciativas`)
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

  cambiarEstado(id: number, estadoCodigo: EstadoIniciativaCodigo): Observable<Iniciativa> {
    const body: ActualizarEstadoIniciativaRequestDto = {
      estado_codigo: estadoCodigo as ActualizarEstadoIniciativaRequestDto['estado_codigo'],
    };
    return this.http
      .patch<IniciativaDto>(`${this.baseUrl}/${id}/estado`, body)
      .pipe(map(toIniciativa));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
