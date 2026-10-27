import { RouterLink } from '@angular/router';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideCircleAlert,
  LucideCircleCheck,
  LucideCircleX,
  LucideGauge,
  LucideLink2,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { KpiCard } from '../../../../../shared/ds/kpi-card/kpi-card';
import { formatearValor } from '../../../negocio/components/kpi-form-modal/kpi.reglas';
import { EstadoIniciativaCodigo } from '../../../negocio/interfaces/iniciativa.interface';
import {
  TableroAnio,
  TableroColorSemaforo,
} from '../../../negocio/interfaces/tablero-control.interface';
import {
  clasePuntoPerspectiva,
  claseTextoPerspectiva,
  etiquetaPeriodo,
  nombreSemaforo,
  resumenSemaforo,
  tonoSemaforo,
} from '../../../negocio/pages/tablero-control/tablero-control.reglas';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { TableroControlTi, TableroKpiFilaTi } from '../../interfaces/tablero-control-ti.interface';
import { TableroControlTiService } from '../../services/tablero-control-ti.service';

@Component({
  imports: [Badge, Button, Card, Icon, KpiCard, RouterLink],
  selector: 'app-tablero-control-ti-page',
  templateUrl: './tablero-control-ti.html',
})
export class TableroControlTiPage {
  private tableroService = inject(TableroControlTiService);
  private destroyRef = inject(DestroyRef);
  private solicitudActual = 0;

  readonly planSeleccionado = inject(PlanSeleccionadoService);
  readonly LucideCircleAlert = LucideCircleAlert;
  readonly LucideCircleCheck = LucideCircleCheck;
  readonly LucideCircleX = LucideCircleX;
  readonly LucideGauge = LucideGauge;
  readonly LucideLink2 = LucideLink2;
  readonly clasePuntoPerspectiva = clasePuntoPerspectiva;
  readonly claseTextoPerspectiva = claseTextoPerspectiva;
  readonly etiquetaPeriodo = etiquetaPeriodo;
  readonly formatearValor = formatearValor;
  readonly nombreSemaforo = nombreSemaforo;
  readonly tonoSemaforo = tonoSemaforo;

  readonly tablero = signal<TableroControlTi | null>(null);
  readonly cargando = signal(false);
  readonly errorCarga = signal(false);

  readonly filas = computed(
    () => this.tablero()?.perspectivas.flatMap((perspectiva) => perspectiva.kpis) ?? [],
  );
  readonly resumen = computed(() => resumenSemaforo(this.filas()));
  readonly aniosPlan = computed(() => {
    const tablero = this.tablero();
    if (!tablero) return [];
    return Array.from(
      { length: tablero.anioFin - tablero.anioInicio + 1 },
      (_, indice) => tablero.anioInicio + indice,
    );
  });
  readonly totalColumnas = computed(() => 8 + this.aniosPlan().length);
  readonly anchoMinimoTabla = computed(() => `${1460 + this.aniosPlan().length * 180}px`);

  constructor() {
    effect(() => {
      const planId = this.planSeleccionado.planId();
      this.tablero.set(null);
      this.cargarTablero(planId);
    });
  }

  cargarTablero(planId: number | null = this.planSeleccionado.planId()): void {
    const solicitud = ++this.solicitudActual;
    if (planId === null) {
      this.cargando.set(false);
      this.errorCarga.set(false);
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set(false);
    this.tableroService
      .obtener(planId)
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudActual) this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tablero) => {
          if (solicitud !== this.solicitudActual) return;
          this.tablero.set(tablero);
        },
        error: () => {
          if (solicitud !== this.solicitudActual) return;
          this.tablero.set(null);
          this.errorCarga.set(true);
        },
      });
  }

  valorDelAnio(fila: TableroKpiFilaTi, anio: number): TableroAnio | null {
    return fila.anios.find((valor) => valor.anio === anio) ?? null;
  }

  claseFondoPerspectiva(orden: number): string {
    if (orden === 1) return 'bg-success/8';
    if (orden === 2) return 'bg-info/7';
    if (orden === 3) return 'bg-warning/8';
    return 'bg-muted-foreground/7';
  }

  clasePuntoIniciativa(estado: EstadoIniciativaCodigo): string {
    if (estado === 'EN_PROCESO') return 'bg-warning';
    if (estado === 'COMPLETADA') return 'bg-success';
    if (estado === 'CANCELADA') return 'bg-destructive';
    return 'bg-muted-foreground';
  }

  textoMeta(meta: number | null, simbolo: string): string {
    return meta === null ? '—' : formatearValor(meta, simbolo);
  }

  colorValido(color: TableroColorSemaforo | null): color is TableroColorSemaforo {
    return color !== null;
  }
}
