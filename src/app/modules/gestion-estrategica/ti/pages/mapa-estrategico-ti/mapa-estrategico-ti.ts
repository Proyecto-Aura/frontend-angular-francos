import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { ObjetivoEstrategicoService } from '../../../negocio/services/objetivo-estrategico.service';
import { PerspectivaBsc } from '../../../negocio/interfaces/objetivo-estrategico.interface';
import { MapaEstrategicoTi } from '../../components/mapa-estrategico-ti/mapa-estrategico-ti';
import { calcularMapa } from '../../../negocio/components/mapa-estrategico/mapa-estrategico.layout';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';
import { ObjetivoEstrategicoTiService } from '../../services/objetivo-estrategico-ti.service';

@Component({
  imports: [Button, Card, MapaEstrategicoTi, RouterLink],
  selector: 'app-mapa-estrategico-ti-page',
  templateUrl: './mapa-estrategico-ti.html',
})
export class MapaEstrategicoTiPage implements OnInit {
  private objetivoTiService = inject(ObjetivoEstrategicoTiService);
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
  readonly objetivos = signal<ObjetivoEstrategicoTi[]>([]);
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
    this.objetivoTiService
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
