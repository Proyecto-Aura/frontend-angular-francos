import { Alert } from '../../../../../shared/ds/alert/alert';
import { crearAlertaTemporal } from '../../../../../shared/ds/alert/alerta-temporal';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { KpiApiErrorDto } from '../../interfaces/kpi-dto.interface';
import { Kpi } from '../../interfaces/kpi.interface';
import { KpiService } from '../../services/kpi.service';

@Component({
  imports: [Alert, Button, Modal],
  selector: 'app-kpi-eliminar-modal',
  templateUrl: './kpi-eliminar-modal.html',
})
export class KpiEliminarModal {
  private kpiService = inject(KpiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private recargarAlCerrar = false;

  open = input(false);
  kpi = input<Kpi | null>(null);
  closed = output<void>();
  deleted = output<boolean>();

  readonly eliminando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

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
        this.eliminando.set(false);
        this.mostrarErrorAlerta(null);
        this.recargarAlCerrar = false;
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    if (this.recargarAlCerrar) {
      this.recargarAlCerrar = false;
      this.deleted.emit(false);
    }
    this.closed.emit();
  }

  eliminar(): void {
    const kpi = this.kpi();
    if (!kpi || this.eliminando()) return;

    this.eliminando.set(true);
    this.mostrarErrorAlerta(null);
    this.kpiService
      .eliminar(kpi.id)
      .pipe(
        finalize(() => this.eliminando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.deleted.emit(true);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.mostrarErrorAlerta('No se pudo eliminar el KPI. Intente nuevamente.');
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
      this.mostrarErrorAlerta('El KPI ya no existe.');
      this.recargarAlCerrar = true;
      return;
    }
    if (error.status === 409) {
      this.mostrarErrorAlerta(mensaje || 'No se pudo eliminar el KPI. Intente nuevamente.');
      return;
    }
    if (error.status === 401 || error.status === 403) {
      this.mostrarErrorAlerta('No tiene permisos para gestionar KPIs.');
      return;
    }
    this.mostrarErrorAlerta('No se pudo eliminar el KPI. Intente nuevamente.');
  }
}
