import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideArrowRight } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { IniciativaApiErrorDto } from '../../interfaces/iniciativa-dto.interface';
import { Iniciativa } from '../../interfaces/iniciativa.interface';
import { IniciativaService } from '../../services/iniciativa.service';
import { tonoEstado } from '../iniciativa-form-modal/iniciativa.reglas';

@Component({
  imports: [Badge, Button, Icon, Modal],
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
  cancelled = output<void>();

  readonly LucideArrowRight = LucideArrowRight;
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly tonoEstado = tonoEstado;

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.guardando.set(false);
        this.errorGeneral.set(null);
        this.recargarAlCerrar = false;
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    if (this.recargarAlCerrar) {
      this.recargarAlCerrar = false;
      this.cancelled.emit();
    }
    this.closed.emit();
  }

  cancelar(): void {
    const iniciativa = this.iniciativa();
    if (!iniciativa || this.guardando()) return;
    this.guardando.set(true);
    this.errorGeneral.set(null);
    this.iniciativaService
      .cambiarEstado(iniciativa.id, 'CANCELADA')
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.cancelled.emit();
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo actualizar el estado. Intente nuevamente.');
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
      this.errorGeneral.set('La iniciativa ya no existe.');
      this.recargarAlCerrar = true;
    } else if (error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo actualizar el estado. Intente nuevamente.');
    } else if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar iniciativas.');
    } else {
      this.errorGeneral.set('No se pudo actualizar el estado. Intente nuevamente.');
    }
  }
}
