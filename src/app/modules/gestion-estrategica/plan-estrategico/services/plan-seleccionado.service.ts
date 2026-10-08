import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { PlanEstrategico } from '../interfaces/plan-estrategico.interface';
import { PlanEstrategicoService } from './plan-estrategico.service';

@Injectable({ providedIn: 'root' })
export class PlanSeleccionadoService {
  private planService = inject(PlanEstrategicoService);
  private destroyRef = inject(DestroyRef);

  readonly planes = signal<PlanEstrategico[]>([]);
  readonly planId = signal<number | null>(null);
  readonly cargando = signal(false);
  readonly error = signal(false);

  readonly plan = computed(() => this.planes().find((plan) => plan.id === this.planId()) ?? null);

  cargar(): void {
    this.cargando.set(true);
    this.error.set(false);

    this.planService
      .listarTodos()
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (planes) => {
          this.planes.set(planes);

          const planActualId = this.planId();
          if (planActualId !== null && planes.some((plan) => plan.id === planActualId)) {
            return;
          }

          const planPorDefecto =
            planes.find((plan) => plan.estadoCodigo === 'ACTIVO') ??
            planes.find((plan) => plan.estadoCodigo === 'BORRADOR') ??
            planes[0] ??
            null;
          this.planId.set(planPorDefecto?.id ?? null);
        },
        error: () => {
          this.planes.set([]);
          this.planId.set(null);
          this.error.set(true);
        },
      });
  }

  seleccionar(id: number): void {
    this.planId.set(id);
  }
}
