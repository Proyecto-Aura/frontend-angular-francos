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
import { LucideArrowRight } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { IniciativaApiErrorDto } from '../../../negocio/interfaces/iniciativa-dto.interface';
import { ESTADOS_INICIATIVA, Iniciativa } from '../../../negocio/interfaces/iniciativa.interface';
import { IniciativaTiService } from '../../services/iniciativa-ti.service';
import {
  siguienteEstado,
  tonoEstado,
} from '../../../negocio/components/iniciativa-form-modal/iniciativa.reglas';

@Component({
  imports: [Alert, Badge, Button, Icon, Modal],
  selector: 'app-iniciativa-ti-estado-modal',
  templateUrl: './iniciativa-ti-estado-modal.html',
})
export class IniciativaTiEstadoModal {
  private iniciativaService = inject(IniciativaTiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private recargarAlCerrar = false;

  open = input(false);
  iniciativa = input<Iniciativa | null>(null);
  closed = output<void>();
  changed = output<boolean>();

  readonly LucideArrowRight = LucideArrowRight;
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);
  readonly siguiente = computed(() => {
    const iniciativa = this.iniciativa();
    return iniciativa ? siguienteEstado(iniciativa.estadoCodigo) : null;
  });
  readonly siguienteNombre = computed(
    () => ESTADOS_INICIATIVA.find((estado) => estado.codigo === this.siguiente())?.nombre ?? '',
  );
  readonly tonoActual = computed(() => tonoEstado(this.iniciativa()?.estadoCodigo ?? 'PENDIENTE'));
  readonly tonoSiguiente = computed(() => tonoEstado(this.siguiente() ?? 'PENDIENTE'));

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
        this.mostrarErrorAlerta(null);
        this.recargarAlCerrar = false;
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    if (this.recargarAlCerrar) {
      this.recargarAlCerrar = false;
      this.changed.emit(false);
    }
    this.closed.emit();
  }

  cambiarEstado(): void {
    const iniciativa = this.iniciativa();
    const siguiente = this.siguiente();
    if (!iniciativa || !siguiente || this.guardando()) return;

    this.guardando.set(true);
    this.mostrarErrorAlerta(null);
    this.iniciativaService
      .cambiarEstado(iniciativa.id, siguiente)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.changed.emit(true);
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
    const mensaje = mensajeApi(error);
    if (error.status === 404) {
      this.mostrarErrorAlerta('La iniciativa ya no existe.');
      this.recargarAlCerrar = true;
    } else if (error.status === 409) {
      this.mostrarErrorAlerta(mensaje || 'No se pudo actualizar el estado. Intente nuevamente.');
    } else if (error.status === 401 || error.status === 403) {
      this.mostrarErrorAlerta('No tiene permisos para gestionar iniciativas.');
    } else {
      this.mostrarErrorAlerta('No se pudo actualizar el estado. Intente nuevamente.');
    }
  }
}

function mensajeApi(error: HttpErrorResponse): string {
  const apiError = error.error as Partial<IniciativaApiErrorDto> | null;
  return (
    Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : []
  ).join(' ');
}
