import { Alert } from '../../../../../shared/ds/alert/alert';
import { crearAlertaTemporal } from '../../../../../shared/ds/alert/alerta-temporal';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideArrowRight } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { IniciativaApiErrorDto } from '../../interfaces/iniciativa-dto.interface';
import { Iniciativa } from '../../interfaces/iniciativa.interface';
import { IniciativaService } from '../../services/iniciativa.service';
import { tonoEstado, validarMotivoCancelacion } from '../iniciativa-form-modal/iniciativa.reglas';

@Component({
  imports: [Alert, Badge, Button, Field, Icon, Modal, Textarea],
  selector: 'app-iniciativa-cancelar-modal',
  templateUrl: './iniciativa-cancelar-modal.html',
})
export class IniciativaCancelarModal {
  private iniciativaService = inject(IniciativaService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private recargarAlCerrar = false;

  open = input(false);
  iniciativa = input<Iniciativa | null>(null);
  closed = output<void>();
  cancelled = output<boolean>();

  readonly LucideArrowRight = LucideArrowRight;
  readonly guardando = signal(false);
  readonly motivo = signal('');
  readonly errorMotivo = signal<string | null>(null);
  readonly errorGeneral = signal<string | null>(null);
  readonly tonoEstado = tonoEstado;

  private alertas = crearAlertaTemporal(() => this.errorGeneral.set(null));
  toast = this.alertas.toast;
  private mostrarErrorAlerta(mensaje: string | null): void {
    if (!mensaje) {
      this.alertas.limpiar();
      return;
    }
    this.alertas.mostrar('error', mensaje);
    this.errorGeneral.set(mensaje);
  }

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.guardando.set(false);
        this.motivo.set('');
        this.errorMotivo.set(null);
        this.mostrarErrorAlerta(null);
        this.recargarAlCerrar = false;
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    if (this.recargarAlCerrar) {
      this.recargarAlCerrar = false;
      this.cancelled.emit(false);
    }
    this.closed.emit();
  }

  cancelar(): void {
    const iniciativa = this.iniciativa();
    if (!iniciativa || this.guardando()) return;
    const errorMotivo = validarMotivoCancelacion(this.motivo());
    this.errorMotivo.set(errorMotivo);
    this.mostrarErrorAlerta(null);
    if (errorMotivo) return;

    this.guardando.set(true);
    this.iniciativaService
      .cambiarEstado(iniciativa.id, 'CANCELADA', this.motivo())
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cancelled.emit(true);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.mostrarErrorAlerta('No se pudo actualizar el estado. Intente nuevamente.');
      return;
    }
    const apiError = error.error as Partial<IniciativaApiErrorDto> | null;
    const mensaje = (
      Array.isArray(apiError?.message)
        ? apiError.message
        : apiError?.message
          ? [apiError.message]
          : []
    ).join(' ');
    if (error.status === 404) {
      this.mostrarErrorAlerta('La iniciativa ya no existe.');
      this.recargarAlCerrar = true;
    } else if (error.status === 409) {
      this.mostrarErrorAlerta(mensaje || 'No se pudo actualizar el estado. Intente nuevamente.');
    } else if (error.status === 400) {
      this.mostrarErrorAlerta(mensaje || 'No se pudo actualizar el estado. Intente nuevamente.');
    } else if (error.status === 401 || error.status === 403) {
      this.mostrarErrorAlerta('No tiene permisos para gestionar iniciativas.');
    } else {
      this.mostrarErrorAlerta('No se pudo actualizar el estado. Intente nuevamente.');
    }
  }
}
