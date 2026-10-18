import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideCreditCard, LucideFileText, LucidePackage } from '@lucide/angular';
import { Subscription, finalize } from 'rxjs';

import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import {
  PedidoDetalle as Detalle,
  ResultadoGuardado,
  estadoLabel,
  estadoTone,
  fechaHora,
  money,
  nf,
} from '../../interfaces/pedido.interface';
import { PedidosService } from '../../services/pedidos.service';
import { mensajeDeErrorPedido } from '../../utils/error-api';

interface Campo {
  label: string;
  value: string;
}

/** RF-A031: detalle completo de un pedido con sus productos y su pago. */
@Component({
  imports: [Badge, Button, Icon, Modal],
  selector: 'app-pedido-detalle',
  templateUrl: './pedido-detalle.html',
})
export class PedidoDetalle {
  private pedidosService = inject(PedidosService);
  private destroyRef = inject(DestroyRef);

  /** null = cerrado. */
  pedidoId = input<number | null>(null);
  closed = output<void>();
  /** HU-A-010: avisa a la pantalla el resultado de cambiar el estado del pedido. */
  estadoCambiado = output<ResultadoGuardado>();

  readonly LucideFileText = LucideFileText;
  readonly LucidePackage = LucidePackage;
  readonly LucideCreditCard = LucideCreditCard;

  protected readonly money = money;
  protected readonly nf = nf;
  protected readonly estadoLabel = estadoLabel;
  protected readonly estadoTone = estadoTone;

  protected detalle = signal<Detalle | null>(null);
  protected cargando = signal(false);
  protected error = signal('');
  protected cambiandoEstado = signal(false);

  private peticion: Subscription | null = null;

  constructor() {
    effect(() => {
      const id = this.pedidoId();
      untracked(() => this.cargar(id));
    });
  }

  protected cargar(id: number | null = this.pedidoId()) {
    this.peticion?.unsubscribe();
    this.detalle.set(null);
    this.error.set('');
    if (id === null) return;

    this.cargando.set(true);
    this.peticion = this.pedidosService
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          this.detalle.set(detalle);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.error.set(mensajeDeErrorPedido(error, 'No se pudo cargar el pedido.'));
          this.cargando.set(false);
        },
      });
  }

  /**
   * HU-A-010 (RF-A038): pasa el pedido confirmado a "en espera de inventario"
   * para que lo vea el operador de productos terminados. El detalle sigue
   * abierto con el estado nuevo, como en el prototipo.
   */
  protected pasarAEnEsperaDeInventario(d: Detalle) {
    if (this.cambiandoEstado()) return;

    this.cambiandoEstado.set(true);
    this.pedidosService
      .enviarAInventario(d.id)
      .pipe(
        finalize(() => this.cambiandoEstado.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (actualizado) => {
          this.detalle.set(actualizado);
          this.estadoCambiado.emit({
            tono: 'ok',
            mensaje: `Pedido ${d.codigo} pasó a En espera de inventario · visible para Inventario.`,
          });
        },
        error: (error: unknown) =>
          this.estadoCambiado.emit({
            tono: 'error',
            mensaje: mensajeDeErrorPedido(
              error,
              `No se pudo pasar el pedido ${d.codigo} a En espera de inventario.`,
            ),
          }),
      });
  }

  protected camposPedido(d: Detalle): Campo[] {
    return [
      { label: 'Cliente', value: d.cliente },
      { label: 'Fecha de creación', value: fechaHora(d.creado) },
      { label: 'Tipo de entrega', value: d.tipoEntrega },
      { label: 'Dirección', value: d.direccion ?? '—' },
      { label: 'Origen', value: d.origen },
    ];
  }

  protected camposPago(d: Detalle): Campo[] {
    const pago = d.pago;
    if (!pago) return [];
    return [
      { label: 'Método de pago', value: pago.metodo },
      { label: 'Monto', value: money(pago.monto) },
      { label: 'N.º de operación', value: pago.operacion ?? '—' },
      { label: 'Fecha de pago', value: fechaHora(pago.fecha) },
      { label: 'Boleta o factura', value: pago.comprobante ?? 'Pendiente de emisión' },
    ];
  }
}
