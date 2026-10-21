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
import { LucideTriangleAlert } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { relacionesDeObjetivo } from '../../../negocio/components/objetivo-estrategico-eliminar-modal/objetivo-estrategico-eliminar.reglas';
import { ApiErrorDto } from '../../../negocio/interfaces/objetivo-estrategico-dto.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';

@Component({
  imports: [Button, Icon, Modal],
  selector: 'app-objetivo-estrategico-ti-eliminar-modal',
  templateUrl: './objetivo-estrategico-ti-eliminar-modal.html',
})
export class ObjetivoEstrategicoTiEliminarModal {
  private objetivoService = inject(ObjetivoEstrategicoTiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  objetivo = input<ObjetivoEstrategicoTi | null>(null);
  objetivosDelPlan = input<ObjetivoEstrategicoTi[]>([]);
  closed = output<void>();
  deleted = output<void>();

  readonly LucideTriangleAlert = LucideTriangleAlert;
  readonly eliminando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly relaciones = computed(() => {
    const objetivo = this.objetivo();
    return objetivo
      ? relacionesDeObjetivo(objetivo, this.objetivosDelPlan())
      : { salientes: [], entrantes: [] };
  });
  readonly tieneRelaciones = computed(
    () => this.relaciones().salientes.length > 0 || this.relaciones().entrantes.length > 0,
  );

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
    const objetivo = this.objetivo();
    if (!objetivo || this.tieneRelaciones()) return;

    this.eliminando.set(true);
    this.errorGeneral.set(null);
    this.objetivoService
      .eliminar(objetivo.id)
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
      this.errorGeneral.set('No se pudo eliminar el objetivo. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para eliminar objetivos estratégicos de TI.');
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
        mensajes.join(' ') || 'No se pudo eliminar el objetivo. Intente nuevamente.',
      );
      return;
    }

    this.errorGeneral.set('No se pudo eliminar el objetivo. Intente nuevamente.');
  }
}
