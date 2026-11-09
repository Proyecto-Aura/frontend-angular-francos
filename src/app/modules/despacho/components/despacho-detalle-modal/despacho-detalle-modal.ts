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
import { LucideTruck } from '@lucide/angular';
import { Observable, Subscription, finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../shared/ds/badge/badge';
import { Button } from '../../../../shared/ds/button/button';
import { Card } from '../../../../shared/ds/card/card';
import { CellStack } from '../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../shared/ds/icon/icon';
import { Modal } from '../../../../shared/ds/modal/modal';
import { DespachoPedidoDetalle, EstadoDespacho } from '../../interfaces/despacho-pedido.interface';
import {
  etiquetaEstadoDespacho,
  etiquetaTipoEntrega,
  tonoEstadoDespacho,
} from '../../mappers/despacho-pedido.mapper';
import { DespachoPedidoService } from '../../services/despacho-pedido.service';

interface Campo {
  label: string;
  value: string;
}

interface FilaItem {
  id: number;
  producto: string;
  sku: string;
  presentacion: string;
  cantidadMostrada: string;
}

// Detalle de un pedido de despacho (HU-A-023, RF-A095) con las dos acciones
// del operador: "Iniciar despacho" (pendiente a entregar -> en camino, RF-A096)
// y "Marcar como entregado" (en camino -> entregado, RF-A098). Los pedidos
// entregados son de solo lectura.
//
// Cada PATCH devuelve el pedido ya actualizado con el mismo shape que
// obtener(): el modal sigue abierto mostrando el nuevo estado (y, tras salir a
// reparto, ya ofrece "Marcar como entregado") y avisa al listado con
// `actualizado` para que refresque sus filas y sus tarjetas.
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Icon, Modal],
  selector: 'app-despacho-detalle-modal',
  templateUrl: './despacho-detalle-modal.html',
})
export class DespachoDetalleModal {
  private despachoService = inject(DespachoPedidoService);
  private destroyRef = inject(DestroyRef);
  private cargaSub: Subscription | null = null;

  @ViewChild('productoCell', { static: true })
  productoCellTpl!: TemplateRef<{ $implicit: FilaItem; index: number }>;

  /** null = cerrado. */
  pedidoId = input<number | null>(null);
  closed = output<void>();
  // Se emite cuando una transición de estado se aplica (o rebota en 409 y hay
  // que refrescar igual): el listado vuelve a pedir su página y sus totales.
  actualizado = output<void>();

  readonly LucideTruck = LucideTruck;

  pedido = signal<DespachoPedidoDetalle | null>(null);
  cargando = signal(false);
  error = signal(false);
  avanzando = signal(false);
  errorAvance = signal('');

  columnas = computed<DsColumn[]>(() => [
    { key: 'producto', header: 'Producto', cellTemplate: this.productoCellTpl },
    { key: 'presentacion', header: 'Presentación', muted: true },
    { key: 'cantidadMostrada', header: 'Cantidad', numeric: true, strong: true },
  ]);

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

    this.cargaSub = this.despachoService
      .obtener(id)
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pedido) => this.pedido.set(pedido),
        error: () => {
          this.pedido.set(null);
          this.error.set(true);
        },
      });
  }

  reintentar(): void {
    const id = this.pedidoId();
    if (id !== null) this.cargar(id);
  }

  titulo = computed(() => {
    const p = this.pedido();
    return p ? `Despacho del pedido ${p.codigo}` : 'Despacho del pedido';
  });

  campos = computed<Campo[]>(() => {
    const p = this.pedido();
    if (!p) return [];
    const campos: Campo[] = [
      { label: 'Cliente', value: p.clienteNombre },
      { label: 'Fecha del pedido', value: this.formatearFechaHora(p.fechaCreacion) },
      { label: 'Tipo de entrega', value: etiquetaTipoEntrega(p.tipoEntrega) },
    ];
    if (p.direccionEntrega) {
      campos.push({ label: 'Dirección de entrega', value: p.direccionEntrega });
    }
    campos.push(
      {
        label: 'Productos',
        value: `${p.cantidadProductos} ${p.cantidadProductos === 1 ? 'producto' : 'productos'}`,
      },
      { label: 'Unidades', value: `${p.cantidadUnidades}` },
    );
    if (p.fechaEntrega) {
      campos.push({ label: 'Entregado el', value: this.formatearFechaHora(p.fechaEntrega) });
    }
    return campos;
  });

  filas = computed<FilaItem[]>(() => {
    const p = this.pedido();
    if (!p) return [];
    return p.items.map((i) => ({
      id: i.id,
      producto: i.producto,
      sku: i.sku,
      presentacion: i.presentacion,
      cantidadMostrada: `${i.cantidad} unid.`,
    }));
  });

  descripcion = computed(() => {
    switch (this.pedido()?.estado) {
      case 'pendiente_entrega':
        return 'Pedido preparado y listo para salir del almacén.';
      case 'en_camino':
        return 'Pedido en ruta hacia el cliente.';
      case 'entregado':
        return 'Pedido entregado · consulta de solo lectura.';
      default:
        return '';
    }
  });

  nota = computed(() => {
    switch (this.pedido()?.estado) {
      case 'pendiente_entrega':
        return 'Al iniciar el despacho el pedido pasa a «En camino» y se notifica al cliente.';
      case 'en_camino':
        return 'Al marcar como entregado se registra la fecha de entrega.';
      default:
        return null;
    }
  });

  puedeIniciar = computed(() => this.pedido()?.estado === 'pendiente_entrega');
  puedeEntregar = computed(() => this.pedido()?.estado === 'en_camino');
  accionesBloqueadas = computed(() => this.avanzando() || this.cargando() || this.error());

  estadoLabel(estado: EstadoDespacho): string {
    return etiquetaEstadoDespacho(estado);
  }

  estadoTone(estado: EstadoDespacho): BadgeTone {
    return tonoEstadoDespacho(estado);
  }

  iniciarDespacho(): void {
    const p = this.pedido();
    if (!p || !this.puedeIniciar() || this.accionesBloqueadas()) return;
    this.avanzar(
      this.despachoService.marcarEnCamino(p.id),
      'No se pudo iniciar el despacho. Intenta nuevamente.',
      'El pedido ya cambió de estado. Se actualizó la información.',
    );
  }

  marcarEntregado(): void {
    const p = this.pedido();
    if (!p || !this.puedeEntregar() || this.accionesBloqueadas()) return;
    this.avanzar(
      this.despachoService.marcarEntregado(p.id),
      'No se pudo marcar el pedido como entregado. Intenta nuevamente.',
      'No se pudo marcar como entregado. Se actualizó la información del pedido.',
    );
  }

  private avanzar(
    peticion: Observable<DespachoPedidoDetalle>,
    mensajeError: string,
    mensajeConflicto: string,
  ): void {
    this.avanzando.set(true);
    this.errorAvance.set('');

    peticion
      .pipe(
        finalize(() => this.avanzando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (pedido) => {
          this.pedido.set(pedido);
          this.actualizado.emit();
        },
        error: (error) => {
          if (error.status === 409) {
            this.errorAvance.set(mensajeConflicto);
            // El estado pudo cambiar por otra persona: se vuelve a leer para
            // que los botones coincidan con la realidad, y se refresca el
            // listado.
            this.cargar(this.pedido()?.id ?? 0, true);
            this.actualizado.emit();
            return;
          }
          this.errorAvance.set(
            error.status === 404 ? 'El pedido ya no existe en despacho.' : mensajeError,
          );
        },
      });
  }

  cerrar(): void {
    this.cargaSub?.unsubscribe();
    this.pedido.set(null);
    this.error.set(false);
    this.errorAvance.set('');
    this.closed.emit();
  }

  // Parseo manual para fechas "puras" YYYY-MM-DD (sin desfase de zona horaria)
  // y para timestamps completos, mismo criterio que pedido-preparar-detalle-modal.
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
