import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Switch } from '../../../../../shared/ds/switch/switch';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { Promocion } from '../../interfaces/parametros-ventas.interface';
import { ParametrosVentasService } from '../../services/parametros-ventas.service';

interface RowCtx {
  $implicit: FilaPromocion;
  index: number;
}

interface FilaPromocion extends Promocion {
  estadoTexto: string;
  estadoTono: BadgeTone;
}

/** RF-A194: interruptor general de promociones. La tabla es solo de consulta. */
@Component({
  imports: [Badge, Button, Card, CellStack, DataTable, Switch],
  selector: 'app-promociones-card',
  templateUrl: './promociones-card.html',
})
export class PromocionesCard implements OnInit, AfterViewInit {
  private service = inject(ParametrosVentasService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('promocionCell', { static: true }) promocionCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<RowCtx>;

  activas = input(false);
  activasChange = output<boolean>();

  protected readonly promociones = signal<Promocion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');

  protected readonly filas = computed<FilaPromocion[]>(() =>
    this.promociones().map((promocion) => {
      if (!this.activas()) return { ...promocion, estadoTexto: 'Pausada', estadoTono: 'neutral' };
      if (promocion.vigente) return { ...promocion, estadoTexto: 'Vigente', estadoTono: 'success' };
      if (!promocion.activa)
        return { ...promocion, estadoTexto: 'Inactiva', estadoTono: 'neutral' };
      return { ...promocion, estadoTexto: 'Fuera de fechas', estadoTono: 'neutral' };
    }),
  );

  protected readonly vigentes = computed(() => this.promociones().filter((p) => p.vigente).length);

  protected readonly columns = signal<DsColumn[]>([
    { key: 'promocion', header: 'Promoción' },
    { key: 'tipo', header: 'Tipo', muted: true },
    { key: 'estado', header: 'Estado', width: '170px', align: 'right' },
  ]);

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.columns.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'promocion') return { ...columna, cellTemplate: this.promocionCellTpl };
        if (columna.key === 'estado') return { ...columna, cellTemplate: this.estadoCellTpl };
        return columna;
      }),
    );
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.service
      .listarPromociones()
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (promociones) => this.promociones.set(promociones),
        error: (error: unknown) =>
          this.errorCarga.set(apiErrorMessage(error, 'No se pudieron cargar las promociones.')),
      });
  }
}
