import { Component, computed, inject } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import {
  DropdownMenu,
  DropdownMenuItem,
} from '../../../../../shared/ds/dropdown-menu/dropdown-menu';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { EstadoPlanCodigo, PlanEstrategico } from '../../interfaces/plan-estrategico.interface';
import { PlanSeleccionadoService } from '../../services/plan-seleccionado.service';

@Component({
  imports: [Badge, DropdownMenu, Icon],
  selector: 'app-plan-seleccionado-bar',
  templateUrl: './plan-seleccionado-bar.html',
})
export class PlanSeleccionadoBar {
  readonly planSeleccionado = inject(PlanSeleccionadoService);
  readonly LucideChevronDown = LucideChevronDown;

  readonly items = computed<DropdownMenuItem[]>(() =>
    this.planSeleccionado.planes().map((plan) => ({
      label: `${plan.nombre} · ${plan.estadoNombre}`,
      onSelect: () => this.planSeleccionado.seleccionar(plan.id),
    })),
  );

  tonoEstado(estado: EstadoPlanCodigo): BadgeTone {
    if (estado === 'ACTIVO') return 'success';
    if (estado === 'CERRADO') return 'info';
    return 'neutral';
  }

  clasePunto(plan: PlanEstrategico): string {
    if (plan.estadoCodigo === 'ACTIVO') return 'bg-success';
    if (plan.estadoCodigo === 'CERRADO') return 'bg-info';
    return 'bg-muted-foreground';
  }
}
