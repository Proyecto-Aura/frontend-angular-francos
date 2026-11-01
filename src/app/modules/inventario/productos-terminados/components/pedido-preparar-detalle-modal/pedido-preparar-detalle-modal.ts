import {
  Component,
  DestroyRef,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideEye } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import {
  EstadoPedidoPreparar,
  PedidoPrepararDetalle,
} from '../../interfaces/pedido-preparar.interface';
import {
  etiquetaAccionSiguienteEstado,
  etiquetaDisponibilidadPedidoPreparar,
  etiquetaEstadoPedidoPreparar,
  siguienteEstadoPedidoPreparar,
  tonoEstadoPedidoPreparar,
} from '../../mappers/pedido-preparar.mapper';
import { PedidoPrepararService } from '../../services/pedido-preparar.service';

interface Campo {
  label: string;
  value: string;
}

interface FilaItem {
  id: number;
  productoPresentacionId: number;
  producto: string;
  sku: string;
  presentacion: string;
  solicitado: number;
  stockDisponible: number;
  cantidadPreparada: number;
}

// "Ver detalle" de un pedido por preparar (OFT0-260), conectado a
// GET /inventario/pedidos/:id. Ademas del detalle de solo lectura, expone
// la unica accion que tiene sentido desde esta pantalla: avanzar el pedido
// al siguiente estado de inventario (PATCH .../en-preparacion o PATCH
// .../pendiente-entrega segun el estado actual, ver
// siguienteEstadoPedidoPreparar en el mapper) — "pendiente_entrega" ya no
// tiene siguiente paso aca, queda a la espera de que despacho lo recoja
// (modulo aparte, fuera de alcance).
//
// Mientras el pedido esta "en_preparacion", la tabla de items se vuelve
// editable: cada linea tiene un campo "cantidad preparada" (por defecto la
// cantidad solicitada, el operario la ajusta si preparo de mas/menos). Al
// confirmar "pendiente_entrega" esas cantidades se mandan todas juntas — el
// backend genera un movimiento de salida de inventario por producto
// terminado a partir de ahi (confirmado por el backend, incluye reparto
// FEFO entre lotes), asi que el front no arma el movimiento, solo manda la
// cantidad preparada por item.
//
// Los PATCH de transicion devuelven el pedido completo actualizado con el
// mismo shape que obtener() (confirmado por el backend) — se usa esa
// respuesta directamente en vez de volver a pedir el detalle.
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Input, Modal],
  selector: 'app-pedido-preparar-detalle-modal',
  templateUrl: './pedido-preparar-detalle-modal.html',
})
export class PedidoPrepararDetalleModal {
  private pedidoService = inject(PedidoPrepararService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('productoCell', { static: true })
  productoCellTpl!: TemplateRef<{ $implicit: FilaItem; index: number }>;

  @ViewChild('cantidadPreparadaCell', { static: true })
  cantidadPreparadaCellTpl!: TemplateRef<{ $implicit: FilaItem; index: number }>;

  /** null = cerrado. */
  pedidoId = input<number | null>(null);
  closed = output<void>();
  // Se emite cuando una transicion de estado se aplica (o rebota en 409 y
  // hay que refrescar igual) — el listado vuelve a pedir pagina + indicadores.
  actualizado = output<void>();

  readonly LucideEye = LucideEye;

  pedido = signal<PedidoPrepararDetalle | null>(null);
  cargando = signal(false);
  error = signal(false);
  avanzando = signal(false);
  errorAvance = signal('');

  // Cantidad preparada editable por item, keyed por item.id — se
  // resincroniza con "cantidad solicitada" cada vez que se carga un pedido
  // nuevo (ver sincronizarCantidadesPreparadas).
  private cantidadesPreparadas = signal<Map<number, number>>(new Map());

  columnas = computed<DsColumn[]>(() => {
    const columnas: DsColumn[] = [
      { key: 'producto', header: 'Producto', cellTemplate: this.productoCellTpl },
      { key: 'presentacion', header: 'Presentación', muted: true },
      { key: 'solicitado', header: 'Solicitado', numeric: true, strong: true },
    ];
    if (this.pedido()?.estado === 'en_preparacion') {
      columnas.push({
        key: 'cantidadPreparada',
        header: 'Cantidad preparada',
        numeric: true,
        cellTemplate: this.cantidadPreparadaCellTpl,
      });
    } else {
      columnas.push({
        key: 'stockDisponible',
        header: 'Stock disponible',
        numeric: true,
        muted: true,
      });
    }
    return columnas;
  });

  constructor() {
    effect(() => {
      const id = this.pedidoId();
      if (id !== null) {
        this.cargar(id);
      }
    });
  }

  cargar(id: number, conservarErrorAvance = false): void {
    this.cargaSub?.unsubscribe();
    this.cargando.set(true);
    this.error.set(false);
    if (!conservarErrorAvance) this.errorAvance.set('');

    this.cargaSub = this.pedidoService
      .obtener(id)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pedido) => {
          this.pedido.set(pedido);
          this.sincronizarCantidadesPreparadas(pedido);
        },
        error: () => {
          this.pedido.set(null);
          this.error.set(true);
        },
      });
  }

  private sincronizarCantidadesPreparadas(pedido: PedidoPrepararDetalle): void {
    this.cantidadesPreparadas.set(new Map(pedido.items.map((i) => [i.id, i.cantidad])));
  }

  reintentar(): void {
    const id = this.pedidoId();
    if (id !== null) this.cargar(id);
  }

  titulo = computed(() => {
    const p = this.pedido();
    return p ? `Pedido ${p.codigo}` : 'Pedido';
  });

  campos = computed<Campo[]>(() => {
    const p = this.pedido();
    if (!p) return [];
    return [
      { label: 'Cliente', value: p.clienteNombre },
      { label: 'Fecha del pedido', value: this.formatearFechaHora(p.fechaCreacion) },
      { label: 'Productos', value: `${p.cantidadProductos} productos` },
      { label: 'Unidades', value: `${p.cantidadUnidades}` },
      { label: 'Disponibilidad', value: etiquetaDisponibilidadPedidoPreparar(p.disponibilidad) },
    ];
  });

  filas = computed<FilaItem[]>(() => {
    const p = this.pedido();
    if (!p) return [];
    const cantidades = this.cantidadesPreparadas();
    return p.items.map((i) => ({
      id: i.id,
      productoPresentacionId: i.productoPresentacionId,
      producto: i.producto,
      sku: i.sku,
      presentacion: i.presentacion,
      solicitado: i.cantidad,
      stockDisponible: i.stockDisponible,
      cantidadPreparada: cantidades.get(i.id) ?? i.cantidad,
    }));
  });

  textoAyuda = computed(() => {
    const estado = this.pedido()?.estado;
    if (estado === 'en_espera_inventario') {
      if (this.inicioBloqueado()) return null;
      return 'Inicia la preparación para registrar las cantidades preparadas.';
    }
    if (estado === 'en_preparacion') {
      return 'Ajusta la cantidad preparada si es distinta a la solicitada. Al confirmar se registrará la salida de inventario.';
    }
    return null;
  });

  faltantesStock = computed(() =>
    this.filas()
      .filter((fila) => fila.stockDisponible < fila.solicitado)
      .map((fila) => ({ ...fila, faltante: fila.solicitado - fila.stockDisponible })),
  );

  inicioBloqueado = computed(() => {
    const pedido = this.pedido();
    return (
      pedido?.estado === 'en_espera_inventario' &&
      (pedido.items.length === 0 ||
        pedido.disponibilidad !== 'completo' ||
        this.faltantesStock().length > 0)
    );
  });

  actualizarCantidadPreparada(itemId: number, valor: string): void {
    const cantidad = Math.max(0, Number(valor) || 0);
    this.cantidadesPreparadas.update((actual) => {
      const copia = new Map(actual);
      copia.set(itemId, cantidad);
      return copia;
    });
  }

  accionSiguiente = computed(() => {
    const p = this.pedido();
    return p ? etiquetaAccionSiguienteEstado(p.estado) : null;
  });

  estadoLabel(estado: EstadoPedidoPreparar): string {
    return etiquetaEstadoPedidoPreparar(estado);
  }

  estadoTone(estado: EstadoPedidoPreparar): BadgeTone {
    return tonoEstadoPedidoPreparar(estado);
  }

  avanzarEstado(): void {
    const p = this.pedido();
    if (!p || this.avanzando() || this.cargando() || this.error() || this.inicioBloqueado()) return;
    const siguiente = siguienteEstadoPedidoPreparar(p.estado);
    if (!siguiente) return;

    this.avanzando.set(true);
    this.errorAvance.set('');

    if (siguiente === 'pendiente_entrega') {
      const cantidades = this.cantidadesPreparadas();
      const items = p.items.map((i) => ({
        productoPresentacionId: i.productoPresentacionId,
        cantidadPreparada: cantidades.get(i.id) ?? i.cantidad,
      }));

      this.pedidoService
        .marcarPendienteEntrega(p.id, items)
        .pipe(
          finalize(() => this.avanzando.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (actualizado) => {
            this.pedido.set(actualizado);
            this.sincronizarCantidadesPreparadas(actualizado);
            this.actualizado.emit();
          },
          // 409 aca significa stock insuficiente en alguna linea (no se crea
          // nada) — no recargamos, para no perder las cantidades que el
          // operario esta ajustando.
          error: (error) => {
            this.errorAvance.set(
              error.status === 409
                ? 'No hay stock suficiente para alguna línea. Ajusta las cantidades e intenta de nuevo.'
                : error.status === 400
                  ? 'Las cantidades enviadas no coinciden con los productos del pedido.'
                  : 'No se pudo registrar la preparación. Intenta nuevamente.',
            );
          },
        });
      return;
    }

    this.pedidoService
      .marcarEnPreparacion(p.id)
      .pipe(
        finalize(() => this.avanzando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (actualizado) => {
          this.pedido.set(actualizado);
          this.sincronizarCantidadesPreparadas(actualizado);
          this.actualizado.emit();
        },
        error: (error) => {
          this.errorAvance.set(
            error.status === 409
              ? 'El pedido ya cambió de estado. Se actualizará la lista.'
              : 'No se pudo actualizar el estado. Intenta nuevamente.',
          );
          if (error.status === 409) {
            this.actualizado.emit();
            // El refresco por conflicto no debe borrar el mensaje que lo explica.
            this.cargar(p.id, true);
          }
        },
      });
  }

  cerrar(): void {
    this.cargaSub?.unsubscribe();
    this.pedido.set(null);
    this.cantidadesPreparadas.set(new Map());
    this.error.set(false);
    this.errorAvance.set('');
    this.closed.emit();
  }

  // Parseo manual para fechas "puras" YYYY-MM-DD (sin desfase de zona
  // horaria) y para timestamps completos — mismo criterio que
  // solicitud-detalle-modal.ts.
  private formatearFechaHora(fechaIso: string): string {
    const esSoloFecha = fechaIso.length <= 10;
    let fecha: Date;
    if (esSoloFecha) {
      const [anio, mes, dia] = fechaIso.split('-').map(Number);
      fecha = new Date(anio, mes - 1, dia);
    } else {
      fecha = new Date(fechaIso);
    }

    const fechaMostrada = new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
    const horaMostrada = new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(fecha);
    return `${fechaMostrada} · ${horaMostrada}`;
  }
}
