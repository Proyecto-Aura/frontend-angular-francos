import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  imports: [],
  selector: 'home-perfil',
  templateUrl: './home-perfil.html',
  host: { class: 'contents' },
})
export class HomePerfil {

  private router = inject(Router);
  // TODO: reemplazar por los datos reales del usuario autenticado (AuthService)
  userName = input('Andres Chavarri Centeno');
  userSede = input('Sede Central');
  avatarUrl = input<string | null>(null);

  onSubmit() {


    this.router.navigateByUrl('/auth');
  }
}
