import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarInsumoRequestDto,
  CrearInsumoRequestDto,
  IndicadoresInsumosDto,
  InsumoDto,
  InsumosPageDto,
} from '../interfaces/insumo-dto.interface';
import {
  Insumo,
  InsumoForm,
  InsumosPagina,
  NivelStock,
  ResumenInsumos,
} from '../interfaces/insumo.interface';
import {
  toActualizarInsumoRequest,
  toCrearInsumoRequest,
  toInsumo,
  toInsumosPagina,
  toResumenInsumos,
} from '../mappers/insumo.mapper';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;

export interface FiltrosInsumos {
  search?: string;
  // El DTO del backend solo acepta el booleano literal (estado=true/false),
  // no el texto de la opcion ("Activo"/"Inactivo") — mandar otra cosa
  // devuelve 400 "estado must be a boolean value".
  estado?: boolean;
  tipo?: string;
  // Calculado por el backend con el mismo criterio que /insumos/indicadores
  // (confirmado por el backend) — ya no hace falta traer todo el catalogo y
  // filtrar por nivel en el front.
  nivel?: NivelStock;
}

@Injectable({ providedIn: 'root' })
export class InsumoService {
  private http = inject(HttpClient);

  listar(pagina = 1, limite = 10, filtros: FiltrosInsumos = {}): Observable<InsumosPagina> {
    const params: Record<string, string | number | boolean> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.estado !== undefined) params['estado'] = filtros.estado;
    if (filtros.tipo) params['tipo'] = filtros.tipo;
    if (filtros.nivel) params['nivel'] = filtros.nivel;

    return this.http.get<InsumosPageDto>(INSUMOS_BASE, { params }).pipe(map(toInsumosPagina));
  }

  indicadores(): Observable<ResumenInsumos> {
    return this.http
      .get<IndicadoresInsumosDto>(`${INSUMOS_BASE}/indicadores`)
      .pipe(map(toResumenInsumos));
  }

  registrar(form: InsumoForm): Observable<Insumo> {
    const body: CrearInsumoRequestDto = toCrearInsumoRequest(form);
    return this.http.post<InsumoDto>(INSUMOS_BASE, body).pipe(map(toInsumo));
  }

  actualizar(id: number, form: InsumoForm): Observable<Insumo> {
    const body: ActualizarInsumoRequestDto = toActualizarInsumoRequest(form);
    return this.http.patch<InsumoDto>(`${INSUMOS_BASE}/${id}`, body).pipe(map(toInsumo));
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${INSUMOS_BASE}/${id}`);
  }

  activar(id: number): Observable<Insumo> {
    return this.http.patch<InsumoDto>(`${INSUMOS_BASE}/${id}/activate`, null).pipe(map(toInsumo));
  }
}
