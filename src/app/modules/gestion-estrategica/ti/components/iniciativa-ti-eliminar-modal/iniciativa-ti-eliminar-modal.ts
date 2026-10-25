import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { IniciativaApiErrorDto } from '../../../negocio/interfaces/iniciativa-dto.interface';
import { Iniciativa } from '../../../negocio/interfaces/iniciativa.interface';
import { IniciativaTiService } from '../../services/iniciativa-ti.service';

@Component({
  imports: [Button, Modal],
  selector: 'app-iniciativa-ti-eliminar-modal',
  templateUrl: './iniciativa-ti-eliminar-modal.html',
})
export class IniciativaTiEliminarModal {
  private iniciativaService = inject(IniciativaTiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private recargarAlCerrar = false;

  open = input(false);
  iniciativa = input<Iniciativa | null>(null);
  closed = output<void>();
  deleted = output<void>();

  readonly eliminando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.eliminando.set(false);
        this.errorGeneral.set(null);
        this.recargarAlCerrar = false;
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    if (this.recargarAlCerrar) {
      this.recargarAlCerrar = false;
      this.deleted.emit();
    }
    this.closed.emit();
  }

  eliminar(): void {
    const iniciativa = this.iniciativa();
    if (!iniciativa || this.eliminando()) return;
    this.eliminando.set(true);
    this.errorGeneral.set(null);
    this.iniciativaService
      .eliminar(iniciativa.id)
      .pipe(
        finalize(() => this.eliminando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.deleted.emit();
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo eliminar la iniciativa. Intente nuevamente.');
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
      this.errorGeneral.set(mensaje || 'No se pudo eliminar la iniciativa. Intente nuevamente.');
    } else if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar iniciativas.');
    } else {
      this.errorGeneral.set('No se pudo eliminar la iniciativa. Intente nuevamente.');
    }
  }
}
