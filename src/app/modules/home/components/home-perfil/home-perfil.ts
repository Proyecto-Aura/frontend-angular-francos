import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  imports: [],
  selector: 'app-home-perfil',
  templateUrl: './home-perfil.html',
  host: { class: 'contents' },
})
export class HomePerfil {
  private router = inject(Router);
  private authService = inject(AuthService);

  // TODO: reemplazar por los datos reales del usuario autenticado (AuthService)
  userName = input('Andres Chavarri Centeno');
  userSede = input('Sede Central');
  avatarUrl = input<string | null>(null);

  onSubmit() {
    this.authService.logout().subscribe({
      complete: () => this.router.navigateByUrl('/auth'),
      // si el logout en el backend falla igual limpiamos el lado del front y
      // mandamos a login; no tiene sentido dejar al usuario atascado
      error: () => this.router.navigateByUrl('/auth'),
    });
  }
}
