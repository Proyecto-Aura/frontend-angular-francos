import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { ApiErrorDto } from '../../interfaces/plan-estrategico-dto.interface';
import { PlanEstrategico } from '../../interfaces/plan-estrategico.interface';
import { PlanEstrategicoService } from '../../services/plan-estrategico.service';

@Component({
  imports: [Button, Modal],
  selector: 'app-plan-estrategico-eliminar-modal',
  templateUrl: './plan-estrategico-eliminar-modal.html',
})
export class PlanEstrategicoEliminarModal {
  private planService = inject(PlanEstrategicoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  plan = input<PlanEstrategico | null>(null);
  closed = output<void>();
  deleted = output<void>();

  eliminando = signal(false);
  errorGeneral = signal<string | null>(null);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.eliminando.set(false);
        this.errorGeneral.set(null);
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  eliminar(): void {
    const plan = this.plan();
    if (!plan) return;

    this.eliminando.set(true);
    this.errorGeneral.set(null);
    this.planService
      .eliminar(plan.id)
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
      this.errorGeneral.set('No se pudo eliminar el plan. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para eliminar planes estratégicos.');
      return;
    }

    const apiError = error.error as Partial<ApiErrorDto> | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];

    if (error.status === 409) {
      this.errorGeneral.set(
        mensajes.join(' ') || 'No se pudo eliminar el plan. Intente nuevamente.',
      );
      return;
    }

    this.errorGeneral.set('No se pudo eliminar el plan. Intente nuevamente.');
  }
}
