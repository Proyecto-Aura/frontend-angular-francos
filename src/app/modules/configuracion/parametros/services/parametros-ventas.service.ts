import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarUmbralPresentacionRequestDto,
  PaginaVentasDto,
  ParametrosVentasDto,
  PresentacionMayoristaDto,
  PromocionDto,
} from '../interfaces/parametros-ventas-dto.interface';
import {
  ParametrosVentas,
  PresentacionMayorista,
  Promocion,
} from '../interfaces/parametros-ventas.interface';
import {
  toActualizarParametrosRequest,
  toParametrosVentas,
  toPresentacionMayorista,
  toPromocion,
} from '../mappers/parametros-ventas.mapper';

const PARAMETROS_URL = `${environment.apiUrl}/parametros-ventas`;
const PRODUCTO_PRESENTACIONES_URL = `${environment.apiUrl}/producto-presentaciones`;
const PROMOCIONES_URL = `${environment.apiUrl}/promociones`;

export const TAMANIO_PAGINA_UMBRALES = 10;
const LIMITE_PROMOCIONES = 50;

export interface PaginaPresentacionesMayoristas {
  items: PresentacionMayorista[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

@Injectable({ providedIn: 'root' })
export class ParametrosVentasService {
  private http = inject(HttpClient);

  obtener(): Observable<ParametrosVentas> {
    return this.http.get<ParametrosVentasDto>(PARAMETROS_URL).pipe(map(toParametrosVentas));
  }

  /** PATCH solo con los campos que cambiaron. */
  actualizar(cambios: Partial<ParametrosVentas>): Observable<ParametrosVentas> {
    return this.http
      .patch<ParametrosVentasDto>(PARAMETROS_URL, toActualizarParametrosRequest(cambios))
      .pipe(map(toParametrosVentas));
  }

  /** Presentaciones con precio mayorista: son las únicas con umbral que se puede editar. */
  listarPresentaciones(pagina = 1, busqueda = ''): Observable<PaginaPresentacionesMayoristas> {
    let params = new HttpParams()
      .set('page', pagina)
      .set('limit', TAMANIO_PAGINA_UMBRALES)
      .set('con_mayorista', true);
    if (busqueda.trim()) params = params.set('search', busqueda.trim());

    return this.http
      .get<PaginaVentasDto<PresentacionMayoristaDto>>(PRODUCTO_PRESENTACIONES_URL, { params })
      .pipe(
        map((respuesta) => ({
          items: respuesta.data.map(toPresentacionMayorista),
          total: respuesta.meta.total,
          pagina: respuesta.meta.page,
          totalPaginas: respuesta.meta.total_pages,
        })),
      );
  }

  /** Fija el umbral propio de una presentación; `null` lo quita y rige el global. */
  actualizarUmbralPresentacion(id: number, umbral: number | null): Observable<void> {
    const body: ActualizarUmbralPresentacionRequestDto = {
      umbral_mayorista: umbral,
    };
    return this.http
      .patch<unknown>(`${PRODUCTO_PRESENTACIONES_URL}/${id}`, body)
      .pipe(map(() => undefined));
  }

  listarPromociones(): Observable<Promocion[]> {
    const params = new HttpParams().set('page', 1).set('limit', LIMITE_PROMOCIONES);
    return this.http
      .get<PaginaVentasDto<PromocionDto>>(PROMOCIONES_URL, { params })
      .pipe(map((respuesta) => respuesta.data.map(toPromocion)));
  }
}
