import { Alert } from '../../../../../shared/ds/alert/alert';
import { crearAlertaTemporal } from '../../../../../shared/ds/alert/alerta-temporal';
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
import { ApiErrorDto } from '../../interfaces/objetivo-estrategico-dto.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';
import { relacionesDeObjetivo } from './objetivo-estrategico-eliminar.reglas';

@Component({
  imports: [Alert, Button, Icon, Modal],
  selector: 'app-objetivo-estrategico-eliminar-modal',
  templateUrl: './objetivo-estrategico-eliminar-modal.html',
})
export class ObjetivoEstrategicoEliminarModal {
  private objetivoService = inject(ObjetivoEstrategicoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  objetivo = input<ObjetivoEstrategico | null>(null);
  objetivosDelPlan = input<ObjetivoEstrategico[]>([]);
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
    this.mostrarErrorAlerta(null);
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
      this.mostrarErrorAlerta('No se pudo eliminar el objetivo. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.mostrarErrorAlerta('No tiene permisos para eliminar objetivos estratégicos.');
      return;
    }

    const apiError = error.error as Partial<ApiErrorDto> | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];

    if (error.status === 409) {
      this.mostrarErrorAlerta(
        mensajes.join(' ') || 'No se pudo eliminar el objetivo. Intente nuevamente.',
      );
      return;
    }

    this.mostrarErrorAlerta('No se pudo eliminar el objetivo. Intente nuevamente.');
  }
}
