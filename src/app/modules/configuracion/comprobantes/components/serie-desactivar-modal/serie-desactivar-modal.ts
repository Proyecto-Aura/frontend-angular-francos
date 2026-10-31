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
  imports: [Button, Modal],
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

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.desactivando.set(false);
        this.errorGeneral.set('');
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
    this.errorGeneral.set('');
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
          this.errorGeneral.set(
            apiErrorMessage(error, 'No se pudo desactivar la serie. Intente nuevamente.'),
          ),
      });
  }
}
