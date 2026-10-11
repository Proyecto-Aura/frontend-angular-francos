import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideArrowRight, LucideOctagonAlert } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Checkbox } from '../../../../../shared/ds/checkbox/checkbox';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { ApiErrorDto } from '../../interfaces/plan-estrategico-dto.interface';
import { EstadoPlanCodigo, PlanEstrategico } from '../../interfaces/plan-estrategico.interface';
import { PlanEstrategicoService } from '../../services/plan-estrategico.service';

@Component({
  imports: [Badge, Button, Checkbox, Icon, Modal],
  selector: 'app-plan-estrategico-estado-modal',
  templateUrl: './plan-estrategico-estado-modal.html',
})
export class PlanEstrategicoEstadoModal {
  private planService = inject(PlanEstrategicoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  plan = input<PlanEstrategico | null>(null);
  planActivo = input<PlanEstrategico | null>(null);
  closed = output<void>();
  saved = output<PlanEstrategico>();

  readonly LucideArrowRight = LucideArrowRight;
  readonly LucideOctagonAlert = LucideOctagonAlert;

  confirmacionCierre = signal(false);
  guardando = signal(false);
  errorGeneral = signal<string | null>(null);

  siguienteEstado = computed<EstadoPlanCodigo | null>(() => {
    const estado = this.plan()?.estadoCodigo;
    if (estado === 'BORRADOR') return 'ACTIVO';
    if (estado === 'ACTIVO') return 'CERRADO';
    return null;
  });
  esCierre = computed(() => this.siguienteEstado() === 'CERRADO');
  tieneConflicto = computed(() => {
    const plan = this.plan();
    const planActivo = this.planActivo();
    return this.siguienteEstado() === 'ACTIVO' && !!planActivo && planActivo.id !== plan?.id;
  });
  descripcionModal = computed(() => {
    const plan = this.plan();
    return plan ? `${plan.nombre} (${plan.codigo})` : null;
  });

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.confirmacionCierre.set(false);
        this.guardando.set(false);
        this.errorGeneral.set(null);
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  guardar(): void {
    const plan = this.plan();
    const siguienteEstado = this.siguienteEstado();

    if (!plan || !siguienteEstado || this.tieneConflicto()) {
      return;
    }

    const request =
      siguienteEstado === 'ACTIVO'
        ? this.planService.activar(plan.id)
        : this.planService.cerrar(plan.id);

    this.guardando.set(true);
    this.errorGeneral.set(null);
    request
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (planActualizado) => {
          this.saved.emit(planActualizado);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  nombreEstado(estado: EstadoPlanCodigo): string {
    if (estado === 'BORRADOR') return 'Borrador';
    if (estado === 'ACTIVO') return 'Activo';
    return 'Cerrado';
  }

  tonoEstado(estado: EstadoPlanCodigo): BadgeTone {
    if (estado === 'ACTIVO') return 'success';
    if (estado === 'CERRADO') return 'info';
    return 'neutral';
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo cambiar el estado. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para cambiar el estado del plan.');
      return;
    }

    const apiError = error.error as Partial<ApiErrorDto> | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    this.errorGeneral.set(
      mensajes.join(' ') || 'No se pudo cambiar el estado. Intente nuevamente.',
    );
  }
}
