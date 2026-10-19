import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarPlanEstrategicoRequestDto,
  PlanEstrategicoDto,
  PlanesEstrategicosPageDto,
} from '../interfaces/plan-estrategico-dto.interface';
import {
  PlanEstrategico,
  PlanEstrategicoForm,
  PlanesEstrategicosPagina,
} from '../interfaces/plan-estrategico.interface';
import {
  toActualizarPlanRequest,
  toCrearPlanRequest,
  toPlanEstrategico,
  toPlanesEstrategicosPagina,
} from '../mappers/plan-estrategico.mapper';

const PLANES_ESTRATEGICOS_BASE = `${environment.apiUrl}/planes-estrategicos`;

@Injectable({ providedIn: 'root' })
export class PlanEstrategicoService {
  private http = inject(HttpClient);

  listar(pagina = 1, limite = 10): Observable<PlanesEstrategicosPagina> {
    return this.http
      .get<PlanesEstrategicosPageDto>(PLANES_ESTRATEGICOS_BASE, {
        params: { page: pagina, limit: limite },
      })
      .pipe(map(toPlanesEstrategicosPagina));
  }

  listarTodos(): Observable<PlanEstrategico[]> {
    return this.listar(1, 100).pipe(map((page) => page.planes));
  }

  registrar(form: PlanEstrategicoForm): Observable<PlanEstrategico> {
    return this.http
      .post<PlanEstrategicoDto>(PLANES_ESTRATEGICOS_BASE, toCrearPlanRequest(form))
      .pipe(map(toPlanEstrategico));
  }

  actualizar(id: number, form: PlanEstrategicoForm): Observable<PlanEstrategico> {
    const body: ActualizarPlanEstrategicoRequestDto = toActualizarPlanRequest(form);
    return this.http
      .patch<PlanEstrategicoDto>(`${PLANES_ESTRATEGICOS_BASE}/${id}`, body)
      .pipe(map(toPlanEstrategico));
  }

  activar(id: number): Observable<PlanEstrategico> {
    return this.http
      .patch<PlanEstrategicoDto>(`${PLANES_ESTRATEGICOS_BASE}/${id}/activar`, null)
      .pipe(map(toPlanEstrategico));
  }

  cerrar(id: number): Observable<PlanEstrategico> {
    return this.http
      .patch<PlanEstrategicoDto>(`${PLANES_ESTRATEGICOS_BASE}/${id}/cerrar`, null)
      .pipe(map(toPlanEstrategico));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${PLANES_ESTRATEGICOS_BASE}/${id}`);
  }
}
