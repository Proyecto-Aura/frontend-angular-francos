import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CrearLoteProductoTerminadoRequestDto,
  LoteProductoTerminadoDto,
  LotesProductoTerminadoPageDto,
} from '../interfaces/lote-producto-terminado-dto.interface';
import {
  EstadoLoteProductoTerminado,
  LoteProductoTerminado,
  LoteProductoTerminadoForm,
  LotesProductoTerminadoPagina,
} from '../interfaces/lote-producto-terminado.interface';
import {
  siguienteSecuencialLote,
  toCrearLoteProductoTerminadoRequest,
  toLoteProductoTerminado,
  toLotesProductoTerminadoPagina,
} from '../mappers/lote-producto-terminado.mapper';

const LOTES_BASE = `${environment.apiUrl}/lotes-producto-terminado`;

export interface FiltrosLotesProductoTerminado {
  search?: string;
  productoTerminadoId?: number;
  estado?: EstadoLoteProductoTerminado;
  venceDesde?: string;
  venceHasta?: string;
}

// GET ya existia (OFT0-259); registrar() es nuevo (OFT0-263) — antes los
// lotes de producto terminado nacian por seed, ahora Produccion los carga a
// mano, mismo patron que LoteInsumoService.
@Injectable({ providedIn: 'root' })
export class LoteProductoTerminadoService {
  private http = inject(HttpClient);

  listar(
    pagina = 1,
    limite = 10,
    filtros: FiltrosLotesProductoTerminado = {},
  ): Observable<LotesProductoTerminadoPagina> {
    const params: Record<string, string | number> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.productoTerminadoId !== undefined) {
      params['producto_terminado_id'] = filtros.productoTerminadoId;
    }
    if (filtros.estado) params['estado'] = filtros.estado;
    if (filtros.venceDesde) params['vence_desde'] = filtros.venceDesde;
    if (filtros.venceHasta) params['vence_hasta'] = filtros.venceHasta;

    return this.http
      .get<LotesProductoTerminadoPageDto>(LOTES_BASE, { params })
      .pipe(map(toLotesProductoTerminadoPagina));
  }

  // Proximo secuencial para el codigo_lote de un producto: se calcula a
  // partir del MAXIMO numero ya usado en los codigo_lote de HOY, no de un
  // conteo de filas — mismo criterio que LoteInsumoService.siguienteSecuencial().
  siguienteSecuencial(productoTerminadoId: number): Observable<number> {
    return this.http
      .get<LotesProductoTerminadoPageDto>(LOTES_BASE, {
        params: { producto_terminado_id: productoTerminadoId, page: 1, limit: 100 },
      })
      .pipe(
        map((pageDto) =>
          siguienteSecuencialLote(
            pageDto.data.map((dto) => ({
              codigoLote: dto.codigo_lote,
              fechaProduccion: dto.fecha_produccion,
            })),
          ),
        ),
      );
  }

  registrar(form: LoteProductoTerminadoForm): Observable<LoteProductoTerminado> {
    const body: CrearLoteProductoTerminadoRequestDto = toCrearLoteProductoTerminadoRequest(form);
    return this.http
      .post<LoteProductoTerminadoDto>(LOTES_BASE, body)
      .pipe(map(toLoteProductoTerminado));
  }
}
