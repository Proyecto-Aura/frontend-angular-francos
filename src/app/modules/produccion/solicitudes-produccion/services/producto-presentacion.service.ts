import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PageDto,
  ProductoPresentacionDto,
} from '../interfaces/producto-presentacion-dto.interface';
import { ProductoPresentacionesPagina } from '../interfaces/producto-presentacion.interface';
import { toProductoPresentacionesPagina } from '../mappers/producto-presentacion.mapper';

const PRODUCTO_PRESENTACIONES_BASE = `${environment.apiUrl}/producto-presentaciones`;

export interface FiltrosProductoPresentacion {
  search?: string;
  estado?: boolean;
}

// Solo lo que necesita el selector de "Agregar lote" — listar() nada mas,
// a diferencia del servicio equivalente de Inventario (que ademas gestiona
// stock minimo/maximo, categorias, presentaciones y activar/desactivar,
// fuera de alcance aca).
@Injectable({ providedIn: 'root' })
export class ProductoPresentacionService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosProductoPresentacion = {},
  ): Observable<ProductoPresentacionesPagina> {
    const params: Record<string, string | number | boolean> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.estado !== undefined) params['estado'] = filtros.estado;

    return this.http
      .get<PageDto<ProductoPresentacionDto>>(PRODUCTO_PRESENTACIONES_BASE, { params })
      .pipe(map(toProductoPresentacionesPagina));
  }
}
