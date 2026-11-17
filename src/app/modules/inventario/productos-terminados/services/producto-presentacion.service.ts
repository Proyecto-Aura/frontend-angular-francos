import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarStockProductoTerminadoRequestDto,
  CategoriaDto,
  IndicadoresProductoTerminadoDto,
  PageDto,
  PresentacionDto,
  ProductoPresentacionDto,
} from '../interfaces/producto-presentacion-dto.interface';
import {
  CategoriaOption,
  EditarStockForm,
  NivelStockProducto,
  PresentacionOption,
  ProductoPresentacionesPagina,
  ResumenProductosTerminados,
} from '../interfaces/producto-presentacion.interface';
import {
  toActualizarStockRequest,
  toCategoriaOption,
  toPresentacionOption,
  toProductoPresentacionesPagina,
  toResumenProductosTerminados,
} from '../mappers/producto-presentacion.mapper';

const PRODUCTO_PRESENTACIONES_BASE = `${environment.apiUrl}/producto-presentaciones`;
const PRODUCTOS_TERMINADOS_BASE = `${environment.apiUrl}/productos-terminados`;
const CATEGORIAS_BASE = `${environment.apiUrl}/categorias`;
const PRESENTACIONES_BASE = `${environment.apiUrl}/presentaciones`;

export interface FiltrosProductoPresentacion {
  search?: string;
  estado?: boolean;
  categoriaId?: number;
  presentacionId?: number;
  conStock?: boolean;
  // Calculado por el backend con el mismo criterio que
  // /productos-terminados/indicadores (confirmado por el backend).
  nivel?: NivelStockProducto;
}

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
    if (filtros.categoriaId !== undefined) params['categoria_id'] = filtros.categoriaId;
    if (filtros.presentacionId !== undefined) params['presentacion_id'] = filtros.presentacionId;
    if (filtros.conStock !== undefined) params['con_stock'] = filtros.conStock;
    if (filtros.nivel) params['nivel'] = filtros.nivel;

    return this.http
      .get<PageDto<ProductoPresentacionDto>>(PRODUCTO_PRESENTACIONES_BASE, { params })
      .pipe(map(toProductoPresentacionesPagina));
  }

  indicadores(): Observable<ResumenProductosTerminados> {
    return this.http
      .get<IndicadoresProductoTerminadoDto>(`${PRODUCTOS_TERMINADOS_BASE}/indicadores`)
      .pipe(map(toResumenProductosTerminados));
  }

  // El PATCH responde con un shape plano distinto al de GET /producto-presentaciones
  // (sin producto/presentacion anidados, y su "id" no es el producto_presentacion_id —
  // confirmado con el backend). Ignoramos ese body: el caller ya refresca la lista
  // completa via GET despues de guardar.
  actualizarStock(productoPresentacionId: number, form: EditarStockForm): Observable<void> {
    const body: ActualizarStockProductoTerminadoRequestDto = toActualizarStockRequest(form);
    return this.http
      .patch<unknown>(`${PRODUCTOS_TERMINADOS_BASE}/${productoPresentacionId}`, body)
      .pipe(map(() => undefined));
  }

  // Limite alto para traer el catalogo completo en una sola pagina — mismo
  // criterio que insumos/lotes para poblar selects de filtro.
  listarCategorias(): Observable<CategoriaOption[]> {
    return this.http
      .get<PageDto<CategoriaDto>>(CATEGORIAS_BASE, { params: { page: 1, limit: 100 } })
      .pipe(map((pagina) => pagina.data.map(toCategoriaOption)));
  }

  listarPresentaciones(): Observable<PresentacionOption[]> {
    return this.http
      .get<PageDto<PresentacionDto>>(PRESENTACIONES_BASE, { params: { page: 1, limit: 100 } })
      .pipe(map((pagina) => pagina.data.map(toPresentacionOption)));
  }

  // "Desactivar" es logico (alterna activo/inactivo, sin borrar) — mismo
  // endpoint y mismo criterio que ya usa el modulo de catalogo
  // (ventas/catalogo), no es nuevo. Confirmado con el backend que el rol
  // inventario tiene permiso de escritura aca.
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${PRODUCTO_PRESENTACIONES_BASE}/${id}`);
  }

  // Igual que actualizarStock(): el body de esta respuesta tambien es el
  // shape plano de producto_presentacion (confirmado con el backend), no el
  // embebido de GET /producto-presentaciones — toProductoPresentacion()
  // tiraria un TypeError y el caller nunca refrescaria la fila. Se ignora el
  // body y se deja el refetch via GET al caller.
  activar(id: number): Observable<void> {
    return this.http
      .patch<unknown>(`${PRODUCTO_PRESENTACIONES_BASE}/${id}/activate`, null)
      .pipe(map(() => undefined));
  }
}
