import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  KpiDto,
  KpisPageDto,
  KpiResumenDto,
  KpiValorDto,
  RegistrarKpiValorRequestDto,
} from '../interfaces/kpi-dto.interface';
import { Kpi, KpiForm, KpiValor } from '../interfaces/kpi.interface';
import {
  toActualizarKpiRequest,
  toCrearKpiRequest,
  toKpi,
  toKpisDePagina,
  toKpisDeResumen,
  toKpiValor,
} from '../mappers/kpi.mapper';

@Injectable({ providedIn: 'root' })
export class KpiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/kpis`;

  listarPorObjetivo(objetivoId: number, pagina = 1, limite = 100): Observable<Kpi[]> {
    const params = new HttpParams()
      .set('objetivo_estrategico_id', objetivoId)
      .set('page', pagina)
      .set('limit', limite);
    return this.http.get<KpisPageDto>(this.baseUrl, { params }).pipe(map(toKpisDePagina));
  }

  listarPorPlan(planId: number): Observable<Kpi[]> {
    return this.http
      .get<KpiResumenDto[]>(`${environment.apiUrl}/planes-estrategicos/${planId}/kpis`)
      .pipe(map(toKpisDeResumen));
  }

  crear(form: KpiForm): Observable<Kpi> {
    return this.http.post<KpiDto>(this.baseUrl, toCrearKpiRequest(form)).pipe(map(toKpi));
  }

  actualizar(id: number, form: KpiForm): Observable<Kpi> {
    return this.http
      .patch<KpiDto>(`${this.baseUrl}/${id}`, toActualizarKpiRequest(form))
      .pipe(map(toKpi));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  registrarValor(
    kpiId: number,
    anio: number,
    periodoId: number,
    valor: number,
  ): Observable<KpiValor> {
    const body: RegistrarKpiValorRequestDto = { anio, periodo_id: periodoId, valor };
    return this.http
      .post<KpiValorDto>(`${this.baseUrl}/${kpiId}/valores`, body)
      .pipe(map(toKpiValor));
  }

  listarValores(kpiId: number): Observable<KpiValor[]> {
    return this.http
      .get<KpiValorDto[]>(`${this.baseUrl}/${kpiId}/valores`)
      .pipe(map((valores) => valores.map(toKpiValor)));
  }

  obtenerUltimoValor(kpiId: number): Observable<KpiValor | null> {
    return this.http
      .get<KpiValorDto | null>(`${this.baseUrl}/${kpiId}/valores/ultimo`)
      .pipe(map((valor) => (valor ? toKpiValor(valor) : null)));
  }
}
