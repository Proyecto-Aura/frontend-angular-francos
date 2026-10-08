import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  imports: [],
  selector: 'app-negocio-home',
  templateUrl: './negocio-home.html',
})
export class NegocioHome {
  private route = inject(ActivatedRoute);

  readonly titulo = this.route.snapshot.data['titulo'] ?? 'Gestión estratégica de negocio';
}
