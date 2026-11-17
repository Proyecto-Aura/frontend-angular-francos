import { Component, computed, input, signal } from '@angular/core';
import {
  ALTO_TARJETA,
  ANCHO_ETIQUETA,
  ANCHO_TARJETA,
  MapaRelacion,
  calcularMapa,
  relacionadosCon,
} from '../../../negocio/components/mapa-estrategico/mapa-estrategico.layout';
import {
  ObjetivoEstrategico,
  PerspectivaBsc,
} from '../../../negocio/interfaces/objetivo-estrategico.interface';
import { ObjetivoEstrategicoTi } from '../../interfaces/objetivo-estrategico-ti.interface';

@Component({
  imports: [],
  selector: 'app-mapa-estrategico-ti',
  templateUrl: './mapa-estrategico-ti.html',
})
export class MapaEstrategicoTi {
  perspectivas = input<PerspectivaBsc[]>([]);
  objetivos = input<ObjetivoEstrategicoTi[]>([]);

  readonly ANCHO_ETIQUETA = ANCHO_ETIQUETA;
  readonly ANCHO_TARJETA = ANCHO_TARJETA;
  readonly ALTO_TARJETA = ALTO_TARJETA;
  readonly hoverId = signal<number | null>(null);
  readonly layout = computed(() => calcularMapa(this.perspectivas(), this.objetivos()));
  readonly relacionados = computed(() => {
    const hoverId = this.hoverId();
    return hoverId === null
      ? new Set<number>()
      : relacionadosCon(hoverId, this.layout().relaciones);
  });

  claseFondoFranja(orden: number): string {
    if (orden === 1) return 'bg-success/7';
    if (orden === 2) return 'bg-info/7';
    if (orden === 3) return 'bg-warning/8';
    return 'bg-muted-foreground/7';
  }

  claseTextoPerspectiva(orden: number): string {
    if (orden === 1) return 'text-success';
    if (orden === 2) return 'text-info';
    if (orden === 3) return 'text-warning';
    return 'text-muted-foreground';
  }

  claseBordeTarjeta(orden: number): string {
    if (orden === 1) return 'border-success/45';
    if (orden === 2) return 'border-info/45';
    if (orden === 3) return 'border-warning/50';
    return 'border-muted-foreground/45';
  }

  codigoCorto(codigo: string): string {
    return codigo.split('-').slice(-3).join('-');
  }

  ariaLabel(objetivo: ObjetivoEstrategico): string {
    const cantidad = this.layout().relaciones.filter(
      (relacion) => relacion.origenId === objetivo.id,
    ).length;
    return `${objetivo.nombre}, influye en ${cantidad} objetivos de TI`;
  }

  tarjetaAtenuada(id: number): boolean {
    return this.hoverId() !== null && !this.relacionados().has(id);
  }

  grosorRelacion(relacion: MapaRelacion): number {
    return this.hoverId() !== null && this.relacionActiva(relacion) ? 2 : 1.5;
  }

  opacidadRelacion(relacion: MapaRelacion): number {
    if (this.hoverId() === null) return 0.6;
    return this.relacionActiva(relacion) ? 1 : 0.12;
  }

  private relacionActiva(relacion: MapaRelacion): boolean {
    const hoverId = this.hoverId();
    return relacion.origenId === hoverId || relacion.destinoId === hoverId;
  }
}
