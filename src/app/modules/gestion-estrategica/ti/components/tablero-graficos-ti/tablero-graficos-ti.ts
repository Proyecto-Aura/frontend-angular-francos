import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import {
  SeguimientoKpi,
  SeguimientoKpis,
} from '../../../negocio/interfaces/seguimiento-kpis.interface';
import { SeguimientoKpisTiService } from '../../services/seguimiento-kpis-ti.service';
import {
  clasePuntoPerspectiva,
  claseTextoPerspectiva,
  nombreSemaforo,
  tonoSemaforo,
} from '../../../negocio/pages/tablero-control/tablero-control.reglas';
import {
  claseCumplimiento,
  conteosCumplimiento,
  descripcionMeta,
  descripcionUltimoValor,
  textoPorcentaje,
} from '../../../negocio/pages/tablero-control/tablero-graficos.reglas';
import { KpiTendenciaChart } from '../../../negocio/components/kpi-tendencia-chart/kpi-tendencia-chart';

@Component({
  imports: [Badge, Button, Card, KpiTendenciaChart],
  selector: 'app-tablero-graficos-ti',
  templateUrl: './tablero-graficos-ti.html',
})
export class TableroGraficosTi {
  private seguimientoService = inject(SeguimientoKpisTiService);
  private destroyRef = inject(DestroyRef);
  private solicitudActual = 0;

  readonly planId = input.required<number>();
  readonly cargando = signal(false);
  readonly errorCarga = signal(false);
  readonly datos = signal<SeguimientoKpis | null>(null);

  readonly filas = computed(
    () =>
      this.datos()?.perspectivas.flatMap((perspectiva) =>
        perspectiva.kpis.map((kpi) => ({ perspectiva, kpi })),
      ) ?? [],
  );
  readonly claseCumplimiento = claseCumplimiento;
  readonly clasePuntoPerspectiva = clasePuntoPerspectiva;
  readonly claseTextoPerspectiva = claseTextoPerspectiva;
  readonly conteosCumplimiento = conteosCumplimiento;
  readonly descripcionMeta = descripcionMeta;
  readonly descripcionUltimoValor = descripcionUltimoValor;
  readonly nombreSemaforo = nombreSemaforo;
  readonly textoPorcentaje = textoPorcentaje;
  readonly tonoSemaforo = tonoSemaforo;

  constructor() {
    effect(() => {
      this.datos.set(null);
      this.cargar(this.planId());
    });
  }

  cargar(planId = this.planId()): void {
    const solicitud = ++this.solicitudActual;
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.seguimientoService
      .obtener(planId)
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudActual) this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (datos) => {
          if (solicitud !== this.solicitudActual) return;
          this.datos.set(datos);
        },
        error: () => {
          if (solicitud !== this.solicitudActual) return;
          this.datos.set(null);
          this.errorCarga.set(true);
        },
      });
  }

  anchoCumplimiento(porcentaje: number | null): number {
    return Math.min(100, Math.max(0, porcentaje ?? 0));
  }

  descripcionGrafico(kpi: SeguimientoKpi): string {
    const ultimo = descripcionUltimoValor(kpi);
    const meta = descripcionMeta(kpi);
    return `${kpi.nombre}: ${ultimo.valor} · ${meta.valor}`;
  }
}
