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

import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import {
  ETIQUETA_NIVEL,
  ItemStockMinimo,
  NivelAlerta,
  formatearCantidad,
  nivelDe,
  parsearNumero,
  validarParametrosStock,
} from '../../interfaces/stock-minimo.interface';
import { StockMinimoService } from '../../services/stock-minimo.service';

const TONO_NIVEL: Record<NivelAlerta, BadgeTone> = {
  agotado: 'danger',
  bajo: 'warning',
  normal: 'success',
  alto: 'info',
};

@Component({
  imports: [Badge, Button, Field, Input, Modal],
  selector: 'app-stock-minimo-modal',
  templateUrl: './stock-minimo-modal.html',
})
export class StockMinimoModal {
  private stockService = inject(StockMinimoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  item = input<ItemStockMinimo | null>(null);
  closed = output<void>();
  saved = output<ItemStockMinimo>();

  readonly minimo = signal('');
  readonly maximo = signal('');
  readonly intentoGuardar = signal(false);
  readonly guardando = signal(false);
  readonly errorGeneral = signal('');

  /** En insumos el máximo es obligatorio; en productos terminados es opcional. */
  protected readonly maximoObligatorio = computed(() => this.item()?.tipo === 'insumos');
  protected readonly descripcion = computed(() => {
    const item = this.item();
    return item ? `${item.nombre} · ${item.sku}` : '';
  });
  protected readonly stockActual = computed(() => {
    const item = this.item();
    return item ? formatearCantidad(item.stockActual, item.unidad) : '';
  });
  protected readonly errores = computed(() =>
    this.intentoGuardar()
      ? validarParametrosStock(this.minimo(), this.maximo(), this.maximoObligatorio())
      : {},
  );

  /** Nivel que tendría el ítem con los valores escritos (solo si son válidos). */
  protected readonly nivelPrevisto = computed<NivelAlerta | null>(() => {
    const item = this.item();
    const min = parsearNumero(this.minimo());
    if (!item || min === null) return null;
    const maximoTexto = this.maximo().trim();
    const max = maximoTexto ? parsearNumero(maximoTexto) : null;
    if (maximoTexto && max === null) return null;
    return nivelDe({ stockActual: item.stockActual, stockMinimo: min, stockMaximo: max });
  });
  protected readonly etiquetaNivel = computed(() => {
    const nivel = this.nivelPrevisto();
    return nivel ? ETIQUETA_NIVEL[nivel] : '—';
  });
  protected readonly tonoNivel = computed<BadgeTone>(() => {
    const nivel = this.nivelPrevisto();
    return nivel ? TONO_NIVEL[nivel] : 'neutral';
  });

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) this.prepararFormulario();
      this.estabaAbierto = estaAbierto;
    });
  }

  private prepararFormulario(): void {
    const item = this.item();
    this.minimo.set(item ? String(item.stockMinimo) : '');
    this.maximo.set(item?.stockMaximo != null ? String(item.stockMaximo) : '');
    this.intentoGuardar.set(false);
    this.guardando.set(false);
    this.errorGeneral.set('');
  }

  protected cerrar(): void {
    this.closed.emit();
  }

  protected guardar(): void {
    const item = this.item();
    if (!item) return;

    this.intentoGuardar.set(true);
    this.errorGeneral.set('');
    const errores = validarParametrosStock(this.minimo(), this.maximo(), this.maximoObligatorio());
    if (errores.minimo || errores.maximo) return;

    this.guardando.set(true);
    this.stockService
      .actualizar(item, parsearNumero(this.minimo())!, parsearNumero(this.maximo()))
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saved.emit(item);
          this.closed.emit();
        },
        error: (error: unknown) =>
          this.errorGeneral.set(
            apiErrorMessage(error, 'No se pudo guardar el stock de alerta. Intente nuevamente.'),
          ),
      });
  }
}
