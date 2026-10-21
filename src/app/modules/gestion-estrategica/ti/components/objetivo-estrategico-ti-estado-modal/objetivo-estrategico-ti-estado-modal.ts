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
import { LucideCheck } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { ApiErrorDto } from '../../../negocio/interfaces/objetivo-estrategico-dto.interface';
import {
  ESTADOS_OBJETIVO,
  EstadoObjetivoCodigo,
  TRANSICIONES_OBJETIVO,
} from '../../../negocio/interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';

@Component({
  imports: [Button, Icon, Modal],
  selector: 'app-objetivo-estrategico-ti-estado-modal',
  templateUrl: './objetivo-estrategico-ti-estado-modal.html',
})
export class ObjetivoEstrategicoTiEstadoModal {
  private objetivoService = inject(ObjetivoEstrategicoTiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  objetivo = input<ObjetivoEstrategicoTi | null>(null);
  closed = output<void>();
  saved = output<ObjetivoEstrategicoTi>();

  readonly LucideCheck = LucideCheck;
  readonly estados = ESTADOS_OBJETIVO;
  readonly estadoSeleccionado = signal<EstadoObjetivoCodigo | null>(null);
  readonly guardando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  readonly descripcionModal = computed(() => {
    const objetivo = this.objetivo();
    return objetivo ? `${objetivo.codigo} · ${objetivo.nombre}` : null;
  });
  readonly puedeGuardar = computed(() => {
    const actual = this.objetivo()?.estadoCodigo;
    const seleccionado = this.estadoSeleccionado();
    return !!actual && !!seleccionado && TRANSICIONES_OBJETIVO[actual].includes(seleccionado);
  });
  readonly estadoFinalSeleccionado = computed(() => {
    const estado = this.estadoSeleccionado();
    return estado === 'CUMPLIDO' || estado === 'CANCELADO';
  });
  readonly mensajeFlujo = computed(() => {
    const objetivo = this.objetivo();
    if (!objetivo) return '';
    if (TRANSICIONES_OBJETIVO[objetivo.estadoCodigo].length > 0) {
      return 'Flujo: Pendiente → En proceso → Cumplido. Puede cancelarse mientras no esté cumplido.';
    }
    return `Este objetivo está ${objetivo.estadoNombre.toLocaleLowerCase('es')} y ya no puede cambiar de estado.`;
  });

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.estadoSeleccionado.set(this.objetivo()?.estadoCodigo ?? null);
        this.guardando.set(false);
        this.errorGeneral.set(null);
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  puedeSeleccionar(estado: EstadoObjetivoCodigo): boolean {
    const actual = this.objetivo()?.estadoCodigo;
    return !!actual && TRANSICIONES_OBJETIVO[actual].includes(estado);
  }

  seleccionar(estado: EstadoObjetivoCodigo): void {
    if (this.puedeSeleccionar(estado)) this.estadoSeleccionado.set(estado);
  }

  guardar(): void {
    const objetivo = this.objetivo();
    const estado = this.estadoSeleccionado();
    if (!objetivo || !estado || !this.puedeGuardar()) return;

    this.guardando.set(true);
    this.errorGeneral.set(null);
    this.objetivoService
      .cambiarEstado(objetivo.id, estado)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (objetivoActualizado) => {
          this.saved.emit(objetivoActualizado);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  clasesEstado(estado: EstadoObjetivoCodigo): string {
    const base =
      'flex min-h-10 items-center gap-2.5 rounded-(--radius-field) border px-3.5 py-2 text-left text-ds-base leading-tight';
    const seleccionado = this.estadoSeleccionado() === estado;
    const habilitado = this.puedeSeleccionar(estado);
    const apariencia = seleccionado
      ? 'border-primary bg-accent font-medium text-accent-foreground'
      : 'border-border bg-card text-foreground';
    const interaccion = habilitado ? 'hover:bg-muted' : 'cursor-not-allowed opacity-50';
    return `${base} ${apariencia} ${interaccion}`;
  }

  clasePuntoEstado(estado: EstadoObjetivoCodigo): string {
    const base = 'h-[7px] w-[7px] shrink-0 rounded-full';
    if (estado === 'EN_PROCESO') return `${base} bg-warning`;
    if (estado === 'CUMPLIDO') return `${base} bg-success`;
    if (estado === 'CANCELADO') return `${base} bg-destructive`;
    return `${base} bg-muted-foreground`;
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo cambiar el estado. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para cambiar el estado del objetivo de TI.');
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
        mensajes.join(' ') || 'No se pudo cambiar el estado. Intente nuevamente.',
      );
      return;
    }

    this.errorGeneral.set('No se pudo cambiar el estado. Intente nuevamente.');
  }
}
