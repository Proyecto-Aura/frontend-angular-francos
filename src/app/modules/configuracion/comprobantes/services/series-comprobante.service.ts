import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PaginaSeriesDto,
  SerieComprobanteDto,
} from '../interfaces/serie-comprobante-dto.interface';
import { SerieComprobante, SerieForm } from '../interfaces/serie-comprobante.interface';
import {
  toActualizarSerieRequest,
  toCrearSerieRequest,
  toSerieComprobante,
} from '../mappers/serie-comprobante.mapper';

const SERIES_URL = `${environment.apiUrl}/series-comprobante`;
/** Máximo que acepta el backend por página: una empresa tiene pocas series. */
const LIMITE = 100;

@Injectable({ providedIn: 'root' })
export class SeriesComprobanteService {
  private http = inject(HttpClient);

  /** Todas las series: los filtros y los estados por umbral se resuelven en la pantalla. */
  listar(): Observable<SerieComprobante[]> {
    const params = new HttpParams().set('page', 1).set('limit', LIMITE);

    return this.http
      .get<PaginaSeriesDto>(SERIES_URL, { params })
      .pipe(map((pagina) => pagina.data.map(toSerieComprobante)));
  }

  crear(form: SerieForm): Observable<SerieComprobante> {
    return this.http
      .post<SerieComprobanteDto>(SERIES_URL, toCrearSerieRequest(form))
      .pipe(map(toSerieComprobante));
  }

  /** Edita solo lo que cambió; si no cambió nada, no llama al backend. */
  editar(original: SerieComprobante, form: SerieForm): Observable<SerieComprobante> {
    const cambios = toActualizarSerieRequest(original, form);
    if (Object.keys(cambios).length === 0) return of(original);

    return this.http
      .patch<SerieComprobanteDto>(`${SERIES_URL}/${original.id}`, cambios)
      .pipe(map(toSerieComprobante));
  }

  desactivar(id: number): Observable<SerieComprobante> {
    return this.http
      .delete<SerieComprobanteDto>(`${SERIES_URL}/${id}`)
      .pipe(map(toSerieComprobante));
  }

  activar(id: number): Observable<SerieComprobante> {
    return this.http
      .patch<SerieComprobanteDto>(`${SERIES_URL}/${id}/activate`, {})
      .pipe(map(toSerieComprobante));
  }
}
