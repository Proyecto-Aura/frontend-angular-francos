import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import {
  ActualizarStockRequestDto,
  InsumoStockDto,
  PaginaDto,
  ProductoPresentacionStockDto,
} from '../interfaces/stock-minimo-dto.interface';
import {
  ItemStockMinimo,
  NivelAlerta,
  PaginaStockMinimo,
  TipoStock,
} from '../interfaces/stock-minimo.interface';
import { toItemInsumo, toItemProducto, toPaginaStockMinimo } from '../mappers/stock-minimo.mapper';

const PRODUCTO_PRESENTACIONES_URL = `${environment.apiUrl}/producto-presentaciones`;
const PRODUCTOS_TERMINADOS_URL = `${environment.apiUrl}/productos-terminados`;
const INSUMOS_URL = `${environment.apiUrl}/insumos`;

export const TAMANIO_PAGINA_STOCK = 10;

@Injectable({ providedIn: 'root' })
export class StockMinimoService {
  private http = inject(HttpClient);

  listar(
    tipo: TipoStock,
    pagina = 1,
    busqueda = '',
    nivel: NivelAlerta | '' = '',
  ): Observable<PaginaStockMinimo> {
    let params = new HttpParams().set('page', pagina).set('limit', TAMANIO_PAGINA_STOCK);
    if (busqueda.trim()) params = params.set('search', busqueda.trim());
    if (nivel) params = params.set('nivel', nivel);

    if (tipo === 'productos') {
      return this.http
        .get<PaginaDto<ProductoPresentacionStockDto>>(PRODUCTO_PRESENTACIONES_URL, { params })
        .pipe(map((respuesta) => toPaginaStockMinimo(respuesta, toItemProducto)));
    }
    return this.http
      .get<PaginaDto<InsumoStockDto>>(INSUMOS_URL, { params })
      .pipe(map((respuesta) => toPaginaStockMinimo(respuesta, toItemInsumo)));
  }

  /**
   * Cambia el stock mínimo y máximo. El PATCH de productos responde con otra forma que el
   * listado, así que se ignora el cuerpo: la pantalla recarga la lista después de guardar.
   */
  actualizar(
    item: ItemStockMinimo,
    stockMinimo: number,
    stockMaximo: number | null,
  ): Observable<void> {
    const body: ActualizarStockRequestDto = { stock_minimo: stockMinimo };
    // Un producto sin tope que se deja sin tope no manda nada; solo se manda null para quitarlo.
    if (stockMaximo !== null || item.stockMaximo !== null) body.stock_maximo = stockMaximo;
    const url =
      item.tipo === 'productos'
        ? `${PRODUCTOS_TERMINADOS_URL}/${item.id}`
        : `${INSUMOS_URL}/${item.id}`;
    return this.http.patch<unknown>(url, body).pipe(map(() => undefined));
  }
}
