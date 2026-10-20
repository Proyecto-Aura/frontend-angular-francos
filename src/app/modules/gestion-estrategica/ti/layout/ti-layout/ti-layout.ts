import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlanSeleccionadoBar } from '../../../plan-estrategico/components/plan-seleccionado-bar/plan-seleccionado-bar';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';

@Component({
  imports: [PlanSeleccionadoBar, RouterOutlet],
  selector: 'app-ti-layout',
  templateUrl: './ti-layout.html',
})
export class TiLayout implements OnInit {
  private planSeleccionado = inject(PlanSeleccionadoService);

  ngOnInit(): void {
    this.planSeleccionado.cargar();
  }
}
