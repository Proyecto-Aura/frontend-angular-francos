import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { KpiApiErrorDto } from '../../../negocio/interfaces/kpi-dto.interface';
import { Kpi } from '../../../negocio/interfaces/kpi.interface';
import { KpiTiService } from '../../services/kpi-ti.service';

@Component({
  imports: [Button, Modal],
  selector: 'app-kpi-ti-eliminar-modal',
  templateUrl: './kpi-ti-eliminar-modal.html',
})
export class KpiTiEliminarModal {
  private kpiService = inject(KpiTiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private recargarAlCerrar = false;

  open = input(false);
  kpi = input<Kpi | null>(null);
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
    const kpi = this.kpi();
    if (!kpi || this.eliminando()) return;

    this.eliminando.set(true);
    this.errorGeneral.set(null);
    this.kpiService
      .eliminar(kpi.id)
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
      this.errorGeneral.set('No se pudo eliminar el KPI. Intente nuevamente.');
      return;
    }

    const apiError = error.error as Partial<KpiApiErrorDto> | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');

    if (error.status === 404) {
      this.errorGeneral.set('El KPI ya no existe.');
      this.recargarAlCerrar = true;
      return;
    }
    if (error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo eliminar el KPI. Intente nuevamente.');
      return;
    }
    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar KPIs.');
      return;
    }
    this.errorGeneral.set('No se pudo eliminar el KPI. Intente nuevamente.');
  }
}
