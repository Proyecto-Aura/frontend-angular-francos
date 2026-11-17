import { Alert, AlertTone } from '../../../../../shared/ds/alert/alert';
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
import { finalize } from 'rxjs';

import { Button } from '../../../../../shared/ds/button/button';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import {
  SerieComprobante,
  formatearCorrelativo,
  ultimoNumero,
} from '../../interfaces/serie-comprobante.interface';
import { SeriesComprobanteService } from '../../services/series-comprobante.service';

@Component({
  imports: [Alert, Button, Modal],
  selector: 'app-serie-desactivar-modal',
  templateUrl: './serie-desactivar-modal.html',
})
export class SerieDesactivarModal {
  private seriesService = inject(SeriesComprobanteService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  serie = input<SerieComprobante | null>(null);
  closed = output<void>();
  deactivated = output<SerieComprobante>();

  protected readonly ultimoEmitido = computed(() => {
    const serie = this.serie();
    return serie ? formatearCorrelativo(ultimoNumero(serie)) : '';
  });

  readonly desactivando = signal(false);
  readonly errorGeneral = signal('');

  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  private alertaTimer: ReturnType<typeof setTimeout> | null = null;
  private limpiarAlerta(): void {
    if (this.alertaTimer) clearTimeout(this.alertaTimer);
    this.alertaTimer = null;
    this.errorGeneral.set('');
    this.toast.set(null);
  }
  private mostrarAlerta(tone: AlertTone, title: string, description?: string): void {
    this.limpiarAlerta();
    this.toast.set({ tone, title, description });
    this.alertaTimer = setTimeout(() => this.limpiarAlerta(), 4500);
  }
  private mostrarError(mensaje: string): void {
    this.mostrarAlerta('error', mensaje);
    this.errorGeneral.set(mensaje);
  }

  constructor() {
    this.destroyRef.onDestroy(() => this.limpiarAlerta());
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.desactivando.set(false);
        this.limpiarAlerta();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  protected cerrar(): void {
    this.closed.emit();
  }

  protected desactivar(): void {
    const serie = this.serie();
    if (!serie) return;

    this.desactivando.set(true);
    this.limpiarAlerta();
    this.seriesService
      .desactivar(serie.id)
      .pipe(
        finalize(() => this.desactivando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (desactivada) => {
          this.deactivated.emit(desactivada);
          this.closed.emit();
        },
        error: (error: unknown) =>
          this.mostrarError(
            apiErrorMessage(error, 'No se pudo desactivar la serie. Intente nuevamente.'),
          ),
      });
  }
}
