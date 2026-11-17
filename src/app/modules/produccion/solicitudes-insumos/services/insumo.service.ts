import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { InsumosPageDto } from '../interfaces/insumo-dto.interface';
import { InsumosPagina } from '../interfaces/insumo.interface';
import { toInsumosPagina } from '../mappers/insumo.mapper';

const INSUMOS_BASE = `${environment.apiUrl}/insumos`;

export interface FiltrosInsumos {
  search?: string;
  estado?: boolean;
}

// Solo lo que necesita el selector de "Nueva solicitud de insumos"/"Editar
// solicitud" — listar() nada mas, a diferencia del servicio equivalente de
// Inventario (que ademas gestiona stock minimo/maximo, tipo y activar/
// desactivar, fuera de alcance aca).
@Injectable({ providedIn: 'root' })
export class InsumoService {
  private http = inject(HttpClient);

  listar(pagina = 1, limite = 10, filtros: FiltrosInsumos = {}): Observable<InsumosPagina> {
    const params: Record<string, string | number | boolean> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.estado !== undefined) params['estado'] = filtros.estado;

    return this.http.get<InsumosPageDto>(INSUMOS_BASE, { params }).pipe(map(toInsumosPagina));
  }
}
