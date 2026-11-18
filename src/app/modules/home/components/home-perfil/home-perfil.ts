import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

  // Mismo nombre que se ve mientras responde /auth/me.
  userName = signal('Usuario');
  avatarUrl = signal<string | null>(null);

  // Mismo cálculo de iniciales que app-ds-avatar, para cuando no hay foto.
  initials = computed(() =>
    this.userName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
  );

  constructor() {
    this.authService
      .getCurrentUser()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (me) => {
          this.userName.set(me.nombre_completo);
          this.avatarUrl.set(me.foto_url);
        },
        error: () => undefined,
      });
  }

  onSubmit() {
    this.authService.logout().subscribe({
      complete: () => this.router.navigateByUrl('/auth'),
      // si el logout en el backend falla igual limpiamos el lado del front y
      // mandamos a login; no tiene sentido dejar al usuario atascado
      error: () => this.router.navigateByUrl('/auth'),
    });
  }

  irACambiarContrasena() {
    this.router.navigateByUrl('/auth/forgot-password');
  }
}
