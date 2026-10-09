import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { MapaEstrategico } from '../../components/mapa-estrategico/mapa-estrategico';
import { calcularMapa } from '../../components/mapa-estrategico/mapa-estrategico.layout';
import {
  ObjetivoEstrategico,
  PerspectivaBsc,
} from '../../interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoService } from '../../services/objetivo-estrategico.service';

@Component({
  imports: [Button, Card, MapaEstrategico, RouterLink],
  selector: 'app-mapa-estrategico-page',
  templateUrl: './mapa-estrategico-page.html',
})
export class MapaEstrategicoPage implements OnInit {
  private objetivoService = inject(ObjetivoEstrategicoService);
  private destroyRef = inject(DestroyRef);
  private solicitudObjetivosActual = 0;
  private solicitudPerspectivasActual = 0;
  private cargandoObjetivos = signal(false);
  private cargandoPerspectivas = signal(false);
  private errorObjetivos = signal(false);
  private errorPerspectivas = signal(false);

  readonly planSeleccionado = inject(PlanSeleccionadoService);
  readonly perspectivas = signal<PerspectivaBsc[]>([]);
  readonly objetivos = signal<ObjetivoEstrategico[]>([]);
  readonly cargando = computed(() => this.cargandoObjetivos() || this.cargandoPerspectivas());
  readonly errorCarga = computed(() => this.errorObjetivos() || this.errorPerspectivas());
  readonly layout = computed(() => calcularMapa(this.perspectivas(), this.objetivos()));
  readonly cantidadRelaciones = computed(() => this.layout().relaciones.length);

  constructor() {
    effect(() => {
      const planId = this.planSeleccionado.planId();
      this.objetivos.set([]);
      this.cargarObjetivos(planId);
    });
  }

  ngOnInit(): void {
    this.cargarPerspectivas();
  }

  reintentar(): void {
    this.cargarPerspectivas();
    this.cargarObjetivos(this.planSeleccionado.planId());
  }

  clasePuntoPerspectiva(orden: number): string {
    const base = 'h-2 w-2 shrink-0 rounded-full';
    if (orden === 1) return `${base} bg-success`;
    if (orden === 2) return `${base} bg-info`;
    if (orden === 3) return `${base} bg-warning`;
    return `${base} bg-muted-foreground`;
  }

  private cargarPerspectivas(): void {
    const solicitud = ++this.solicitudPerspectivasActual;
    this.cargandoPerspectivas.set(true);
    this.errorPerspectivas.set(false);
    this.objetivoService
      .listarPerspectivas()
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudPerspectivasActual) {
            this.cargandoPerspectivas.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (perspectivas) => {
          if (solicitud === this.solicitudPerspectivasActual) {
            this.perspectivas.set([...perspectivas].sort((a, b) => a.orden - b.orden));
          }
        },
        error: () => {
          if (solicitud === this.solicitudPerspectivasActual) {
            this.perspectivas.set([]);
            this.errorPerspectivas.set(true);
          }
        },
      });
  }

  private cargarObjetivos(planId: number | null): void {
    const solicitud = ++this.solicitudObjetivosActual;
    if (planId === null) {
      this.cargandoObjetivos.set(false);
      this.errorObjetivos.set(false);
      return;
    }

    this.cargandoObjetivos.set(true);
    this.errorObjetivos.set(false);
    this.objetivoService
      .listarPorPlan(planId)
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudObjetivosActual) {
            this.cargandoObjetivos.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (objetivos) => {
          if (solicitud === this.solicitudObjetivosActual) {
            this.objetivos.set(objetivos);
          }
        },
        error: () => {
          if (solicitud === this.solicitudObjetivosActual) {
            this.objetivos.set([]);
            this.errorObjetivos.set(true);
          }
        },
      });
  }
}
