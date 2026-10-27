import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LotesProductoTerminadoPageDto } from '../interfaces/lote-producto-terminado-dto.interface';
import { LotesProductoTerminadoPagina } from '../interfaces/lote-producto-terminado.interface';
import { toLotesProductoTerminadoPagina } from '../mappers/lote-producto-terminado.mapper';

const LOTES_BASE = `${environment.apiUrl}/lotes-producto-terminado`;

export interface FiltrosLotesProductoTerminado {
  search?: string;
  productoTerminadoId?: number;
  estado?: 'activo' | 'por_vencer' | 'agotado' | 'vencido';
  activo?: boolean;
  // Rango sobre fecha_vencimiento (YYYY-MM-DD) — mismo criterio que
  // lotes-insumo (confirmado por el backend).
  venceDesde?: string;
  venceHasta?: string;
}

// Solo lectura (confirmado por el backend): los lotes de producto terminado
// nacen por seed/produccion, no hay registrar() aca a diferencia de
// LoteInsumoService.
@Injectable({ providedIn: 'root' })
export class LoteProductoTerminadoService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosLotesProductoTerminado = {},
  ): Observable<LotesProductoTerminadoPagina> {
    const params: Record<string, string | number | boolean> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.productoTerminadoId !== undefined) {
      params['producto_terminado_id'] = filtros.productoTerminadoId;
    }
    if (filtros.estado) params['estado'] = filtros.estado;
    if (filtros.activo !== undefined) params['activo'] = filtros.activo;
    if (filtros.venceDesde) params['vence_desde'] = filtros.venceDesde;
    if (filtros.venceHasta) params['vence_hasta'] = filtros.venceHasta;

    return this.http
      .get<LotesProductoTerminadoPageDto>(LOTES_BASE, { params })
      .pipe(map(toLotesProductoTerminadoPagina));
  }
}
