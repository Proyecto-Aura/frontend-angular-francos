import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CrearLoteInsumoRequestDto,
  LoteInsumoDto,
  LotesInsumoPageDto,
} from '../interfaces/lote-insumo-dto.interface';
import { LoteInsumo, LoteInsumoForm, LotesInsumoPagina } from '../interfaces/lote-insumo.interface';
import {
  siguienteSecuencialLote,
  toCrearLoteInsumoRequest,
  toLoteInsumo,
  toLotesInsumoPagina,
} from '../mappers/lote-insumo.mapper';

const LOTES_BASE = `${environment.apiUrl}/lotes-insumo`;

export interface FiltrosLotesInsumo {
  search?: string;
  insumoId?: number;
  estado?: 'activo' | 'agotado' | 'vencido';
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LoteInsumoService {
  private http = inject(HttpClient);

  listar(pagina = 1, limite = 10, filtros: FiltrosLotesInsumo = {}): Observable<LotesInsumoPagina> {
    const params: Record<string, string | number | boolean> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.insumoId !== undefined) params['insumo_id'] = filtros.insumoId;
    if (filtros.estado) params['estado'] = filtros.estado;
    if (filtros.activo !== undefined) params['activo'] = filtros.activo;

    return this.http.get<LotesInsumoPageDto>(LOTES_BASE, { params }).pipe(map(toLotesInsumoPagina));
  }

  // Proximo secuencial para el codigo_lote de un insumo: se calcula a partir
  // del MAXIMO numero ya usado en los codigo_lote existentes (ver
  // siguienteSecuencialLote), no de un conteo de filas — un conteo se
  // desincroniza si se borra un lote fuera de la app. Limite 100 (mismo
  // tope que ya usa insumo.service.ts) para traer el historial del insumo
  // en una sola pagina sin pasarse del maximo que acepta el backend.
  siguienteSecuencial(insumoId: number): Observable<number> {
    return this.http
      .get<LotesInsumoPageDto>(LOTES_BASE, { params: { insumo_id: insumoId, page: 1, limit: 100 } })
      .pipe(map((pageDto) => siguienteSecuencialLote(pageDto.data.map((dto) => dto.codigo_lote))));
  }

  registrar(form: LoteInsumoForm): Observable<LoteInsumo> {
    const body: CrearLoteInsumoRequestDto = toCrearLoteInsumoRequest(form);
    return this.http.post<LoteInsumoDto>(LOTES_BASE, body).pipe(map(toLoteInsumo));
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${LOTES_BASE}/${id}`);
  }

  activar(id: number): Observable<LoteInsumo> {
    return this.http
      .patch<LoteInsumoDto>(`${LOTES_BASE}/${id}/activate`, null)
      .pipe(map(toLoteInsumo));
  }
}
