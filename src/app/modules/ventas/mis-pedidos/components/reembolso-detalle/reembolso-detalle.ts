import {
  Component,
  DestroyRef,
  Type,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideBan,
  LucideCheck,
  LucideCircleCheck,
  LucideLoader,
  LucideMessageSquare,
  LucidePaperclip,
} from '@lucide/angular';
import { Observable, Subscription, finalize } from 'rxjs';

import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { ResultadoGuardado, money } from '../../interfaces/pedido.interface';
import {
  ReembolsoDetalle as Detalle,
  PasoTraza,
  TipoPaso,
  estadoReembolsoLabel,
  estadoReembolsoTone,
  fechaDia,
  trazaDe,
} from '../../interfaces/reembolso.interface';
import { ReembolsosService } from '../../services/reembolsos.service';
import { mensajeDeErrorReembolso } from '../../utils/error-api';

interface Campo {
  label: string;
  value: string;
}

// Íconos y colores de la trazabilidad del prototipo.
const ICONO_PASO: Record<TipoPaso, { icono: Type<unknown>; color: string }> = {
  aprobada: { icono: LucideCircleCheck, color: '#2E7D32' },
  rechazada: { icono: LucideBan, color: '#C62828' },
  motivo: { icono: LucideMessageSquare, color: '#757575' },
  en_culqi: { icono: LucideLoader, color: '#1565C0' },
  confirmada: { icono: LucideCircleCheck, color: '#2E7D32' },
};

/**
 * HU-A-011: detalle de una solicitud de reembolso (RF-A041) con las acciones de
 * aprobar (RF-A042), rechazar con motivo (RF-A043) y, para pagos con Culqi,
 * registrar la confirmación de la devolución (RF-A044, simulada).
 */
@Component({
  imports: [Badge, Button, Field, Icon, Modal, Textarea],
  selector: 'app-reembolso-detalle',
  templateUrl: './reembolso-detalle.html',
})
export class ReembolsoDetalle {
  private reembolsosService = inject(ReembolsosService);
  private destroyRef = inject(DestroyRef);

  /** null = cerrado. */
  reembolsoId = input<number | null>(null);
  closed = output<void>();
  /** Avisa a la pantalla el resultado de aprobar, rechazar o confirmar. */
  cambio = output<ResultadoGuardado>();

  readonly LucideBan = LucideBan;
  readonly LucideCheck = LucideCheck;
  readonly LucidePaperclip = LucidePaperclip;

  protected readonly money = money;
  protected readonly estadoLabel = estadoReembolsoLabel;
  protected readonly estadoTone = estadoReembolsoTone;
  protected readonly iconoPaso = ICONO_PASO;

  protected detalle = signal<Detalle | null>(null);
  protected cargando = signal(false);
  protected error = signal('');
  protected guardando = signal(false);

  // Rechazar es en dos pasos, como en el prototipo: primero pide el motivo.
  protected pideRechazo = signal(false);
  protected motivoRechazo = signal('');
  protected motivoInvalido = signal(false);

  private peticion: Subscription | null = null;

  constructor() {
    effect(() => {
      const id = this.reembolsoId();
      untracked(() => this.cargar(id));
    });
  }

  protected cargar(id: number | null = this.reembolsoId()) {
    this.peticion?.unsubscribe();
    this.detalle.set(null);
    this.error.set('');
    this.pideRechazo.set(false);
    this.motivoRechazo.set('');
    this.motivoInvalido.set(false);
    if (id === null) return;

    this.cargando.set(true);
    this.peticion = this.reembolsosService
      .obtener(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detalle) => {
          this.detalle.set(detalle);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.error.set(mensajeDeErrorReembolso(error, 'No se pudo cargar la solicitud.'));
          this.cargando.set(false);
        },
      });
  }

  /** RF-A042: con Culqi la devolución queda enviada, a la espera de su confirmación. */
  protected aprobar(d: Detalle) {
    this.ejecutar(
      this.reembolsosService.aprobar(d.id),
      d.metodo === 'culqi'
        ? `Solicitud ${d.codigo} aprobada · devolución enviada a Culqi, en espera de confirmación · cliente notificado.`
        : `Solicitud ${d.codigo} aprobada · cliente notificado.`,
      `No se pudo aprobar la solicitud ${d.codigo}.`,
    );
  }

  /** RF-A043: el primer clic pide el motivo; el segundo confirma el rechazo. */
  protected rechazar(d: Detalle) {
    if (!this.pideRechazo()) {
      this.pideRechazo.set(true);
      return;
    }

    const motivo = this.motivoRechazo().trim();
    if (!motivo) {
      this.motivoInvalido.set(true);
      this.cambio.emit({ tono: 'error', mensaje: 'Indica el motivo del rechazo para continuar.' });
      return;
    }

    this.ejecutar(
      this.reembolsosService.rechazar(d.id, motivo),
      `Solicitud ${d.codigo} rechazada · cliente notificado con el motivo.`,
      `No se pudo rechazar la solicitud ${d.codigo}.`,
    );
  }

  /** RF-A044 (simulado): Culqi confirma la devolución y la solicitud pasa a reembolsado. */
  protected confirmarCulqi(d: Detalle) {
    this.ejecutar(
      this.reembolsosService.confirmarDevolucion(d.id),
      `Confirmación de Culqi recibida · solicitud ${d.codigo} pasó a reembolsado · cliente notificado.`,
      `No se pudo registrar la confirmación de Culqi de la solicitud ${d.codigo}.`,
    );
  }

  protected setMotivoRechazo(v: string) {
    this.motivoRechazo.set(v);
    if (v.trim()) this.motivoInvalido.set(false);
  }

  /** El detalle sigue abierto con el estado nuevo, como en el prototipo. */
  private ejecutar(accion: Observable<Detalle>, ok: string, porDefecto: string) {
    if (this.guardando()) return;

    this.guardando.set(true);
    accion
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (actualizado) => {
          this.detalle.set(actualizado);
          this.pideRechazo.set(false);
          this.cambio.emit({ tono: 'ok', mensaje: ok });
        },
        error: (error: unknown) =>
          this.cambio.emit({ tono: 'error', mensaje: mensajeDeErrorReembolso(error, porDefecto) }),
      });
  }

  protected campos(d: Detalle): Campo[] {
    return [
      { label: 'Pedido', value: d.pedido },
      { label: 'Cliente', value: d.cliente },
      { label: 'Fecha', value: fechaDia(d.fecha) },
      { label: 'Método de pago', value: d.metodoLabel },
    ];
  }

  protected traza(d: Detalle): PasoTraza[] {
    return trazaDe(d);
  }
}
