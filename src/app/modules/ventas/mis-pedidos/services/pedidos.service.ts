import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductoPresentacionFilaDto } from '../../catalogo/interfaces/producto-dto.interface';
import {
  ClienteDto,
  PageDto,
  PedidoDetalleDto,
  PedidoResumenDto,
  PersonaDto,
} from '../interfaces/pedido-dto.interface';
import {
  ClienteOpcion,
  FiltrosPedidos,
  PedidoDetalle,
  PedidoFila,
  PedidoFormModel,
  PresentacionOpcion,
} from '../interfaces/pedido.interface';
import {
  toClienteOpciones,
  toCrearPedidoRequest,
  toListarParams,
  toPedidoDetalle,
  toPedidoFila,
  toPresentacionOpciones,
} from '../mappers/pedido.mapper';

const PEDIDOS = `${environment.apiUrl}/pedidos`;
const CLIENTES = `${environment.apiUrl}/clientes`;
const PERSONAS = `${environment.apiUrl}/personas`;
const PRODUCTO_PRESENTACIONES = `${environment.apiUrl}/producto-presentaciones`;

// Máximo que acepta la API por página.
const LIMITE_MAXIMO = 100;

export interface OpcionesRegistro {
  clientes: ClienteOpcion[];
  presentaciones: PresentacionOpcion[];
}

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private http = inject(HttpClient);

  pedidos = signal<PedidoFila[]>([]);
  total = signal(0);
  cargando = signal(false);
  errorCarga = signal(false);

  // ───────────── Lectura ─────────────

  /** RF-A030 y RF-A037: la API filtra, ordena por llegada y pagina. */
  listar(filtros: FiltrosPedidos, page: number, limit: number): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.http
      .get<PageDto<PedidoResumenDto>>(PEDIDOS, { params: toListarParams(filtros, page, limit) })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.pedidos.set(respuesta.data.map(toPedidoFila));
          this.total.set(respuesta.meta.total);
        },
        error: () => {
          this.pedidos.set([]);
          this.total.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  /** RF-A031: detalle con productos y pago. */
  obtener(id: number): Observable<PedidoDetalle> {
    return this.http.get<PedidoDetalleDto>(`${PEDIDOS}/${id}`).pipe(map(toPedidoDetalle));
  }

  /** Clientes y presentaciones que se pueden elegir al registrar un pedido. */
  opcionesRegistro(): Observable<OpcionesRegistro> {
    return forkJoin({
      clientes: this.listarTodos<ClienteDto>(CLIENTES),
      personas: this.listarTodos<PersonaDto>(PERSONAS),
      presentaciones: this.listarTodos<ProductoPresentacionFilaDto>(PRODUCTO_PRESENTACIONES),
    }).pipe(
      map(({ clientes, personas, presentaciones }) => ({
        clientes: toClienteOpciones(clientes, personas),
        presentaciones: toPresentacionOpciones(presentaciones),
      })),
    );
  }

  // ───────────── Escritura ─────────────

  /**
   * RF-A032: registra el pedido manual. Con Culqi se envía el token del checkout
   * y la API cobra antes de guardar; si Culqi rechaza, responde 402 y no se crea.
   */
  registrar(form: PedidoFormModel, culqiToken: string | null = null): Observable<PedidoDetalle> {
    return this.http
      .post<PedidoDetalleDto>(PEDIDOS, toCrearPedidoRequest(form, culqiToken))
      .pipe(map(toPedidoDetalle));
  }

  // ───────────── Apoyo ─────────────

  private listarTodos<T>(url: string): Observable<T[]> {
    const pagina = (page: number) =>
      this.http.get<PageDto<T>>(url, { params: { page, limit: LIMITE_MAXIMO } });

    return pagina(1).pipe(
      switchMap((primera) => {
        const restantes = Array.from(
          { length: Math.max(0, primera.meta.total_pages - 1) },
          (_, i) => pagina(i + 2),
        );

        if (restantes.length === 0) return of(primera.data);

        return forkJoin(restantes).pipe(
          map((paginas) => [primera.data, ...paginas.map((p) => p.data)].flat()),
        );
      }),
    );
  }
}
