import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PageDto } from '../interfaces/pedido-dto.interface';
import {
  RechazarReembolsoRequest,
  ReembolsoDetalleDto,
  ReembolsoResumenDto,
} from '../interfaces/reembolso-dto.interface';
import {
  FiltrosReembolsos,
  ReembolsoDetalle,
  ReembolsoFila,
} from '../interfaces/reembolso.interface';
import {
  toListarReembolsosParams,
  toReembolsoDetalle,
  toReembolsoFila,
} from '../mappers/reembolso.mapper';

const REEMBOLSOS = `${environment.apiUrl}/reembolsos`;

@Injectable({ providedIn: 'root' })
export class ReembolsosService {
  private http = inject(HttpClient);

  solicitudes = signal<ReembolsoFila[]>([]);
  total = signal(0);
  cargando = signal(false);
  errorCarga = signal(false);

  // ───────────── Lectura ─────────────

  /** RF-A039 y RF-A040: la API filtra y pagina, las más recientes primero. */
  listar(filtros: FiltrosReembolsos, page: number, limit: number): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.http
      .get<PageDto<ReembolsoResumenDto>>(REEMBOLSOS, {
        params: toListarReembolsosParams(filtros, page, limit),
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.solicitudes.set(respuesta.data.map(toReembolsoFila));
          this.total.set(respuesta.meta.total);
        },
        error: () => {
          this.solicitudes.set([]);
          this.total.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  /** RF-A041: motivo, evidencia y monto a devolver. */
  obtener(id: number): Observable<ReembolsoDetalle> {
    return this.http.get<ReembolsoDetalleDto>(`${REEMBOLSOS}/${id}`).pipe(map(toReembolsoDetalle));
  }

  // ───────────── Escritura ─────────────

  /** RF-A042: la API exige que la solicitud esté pendiente y tenga evidencia. */
  aprobar(id: number): Observable<ReembolsoDetalle> {
    return this.http
      .patch<ReembolsoDetalleDto>(`${REEMBOLSOS}/${id}/aprobar`, {})
      .pipe(map(toReembolsoDetalle));
  }

  /** RF-A043: el motivo se envía al cliente con la notificación. */
  rechazar(id: number, motivo: string): Observable<ReembolsoDetalle> {
    const cuerpo: RechazarReembolsoRequest = { motivo_rechazo: motivo };
    return this.http
      .patch<ReembolsoDetalleDto>(`${REEMBOLSOS}/${id}/rechazar`, cuerpo)
      .pipe(map(toReembolsoDetalle));
  }

  /**
   * RF-A044: registra la confirmación de Culqi y la solicitud pasa a
   * reembolsado. Es simulada: sin llaves de Culqi no se llama a la pasarela.
   */
  confirmarDevolucion(id: number): Observable<ReembolsoDetalle> {
    return this.http
      .patch<ReembolsoDetalleDto>(`${REEMBOLSOS}/${id}/confirmar-devolucion`, {})
      .pipe(map(toReembolsoDetalle));
  }
}
