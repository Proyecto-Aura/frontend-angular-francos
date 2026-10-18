import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  FrecuenciaMedicionDto,
  PeriodoDto,
  UnidadMedidaKpiDto,
} from '../interfaces/kpi-dto.interface';
import { Frecuencia, Periodo, UnidadMedida } from '../interfaces/kpi.interface';
import { toFrecuencia, toPeriodo, toUnidadMedida } from '../mappers/kpi.mapper';

@Injectable({ providedIn: 'root' })
export class CatalogoKpiService {
  private http = inject(HttpClient);

  private frecuencias$ = this.http
    .get<FrecuenciaMedicionDto[]>(`${environment.apiUrl}/frecuencias-medicion`)
    .pipe(
      map((frecuencias) => frecuencias.map(toFrecuencia)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  private unidades$ = this.http
    .get<UnidadMedidaKpiDto[]>(`${environment.apiUrl}/unidades-medida-kpi`)
    .pipe(
      map((unidades) => unidades.map(toUnidadMedida)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  listarFrecuencias(): Observable<Frecuencia[]> {
    return this.frecuencias$;
  }

  listarPeriodos(frecuenciaId: number): Observable<Periodo[]> {
    return this.http
      .get<PeriodoDto[]>(`${environment.apiUrl}/periodos`, {
        params: { frecuencia_id: frecuenciaId },
      })
      .pipe(map((periodos) => periodos.map(toPeriodo)));
  }

  listarUnidades(): Observable<UnidadMedida[]> {
    return this.unidades$;
  }
}
