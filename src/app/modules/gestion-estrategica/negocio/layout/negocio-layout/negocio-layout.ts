import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlanSeleccionadoBar } from '../../../plan-estrategico/components/plan-seleccionado-bar/plan-seleccionado-bar';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';

@Component({
  imports: [PlanSeleccionadoBar, RouterOutlet],
  selector: 'app-negocio-layout',
  templateUrl: './negocio-layout.html',
})
export class NegocioLayout implements OnInit {
  private planSeleccionado = inject(PlanSeleccionadoService);

  ngOnInit(): void {
    this.planSeleccionado.cargar();
  }
}
