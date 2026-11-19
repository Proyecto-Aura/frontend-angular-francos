import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Alert, AlertTone } from '../../../../shared/ds/alert/alert';
import { AuthService } from '../../../auth/services/auth.service';

// Tiempo para que se alcance a ver el toast antes de salir de esta pantalla.
const DEMORA_ANTES_DE_NAVEGAR_MS = 1200;
const DEMORA_AUTOCIERRE_TOAST_MS = 4500;
const DEMORA_SALIDA_TOAST_MS = 300;

@Component({
  imports: [Alert],
  selector: 'app-home-perfil',
  templateUrl: './home-perfil.html',
  host: { class: 'contents' },
})
export class HomePerfil implements OnDestroy {
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

  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  toastVisible = signal(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private toastSalidaTimer: ReturnType<typeof setTimeout> | null = null;

  private mostrarToast(tone: AlertTone, title: string, description?: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastSalidaTimer) clearTimeout(this.toastSalidaTimer);

    this.toast.set({ tone, title, description });
    this.toastVisible.set(false);
    requestAnimationFrame(() => requestAnimationFrame(() => this.toastVisible.set(true)));

    this.toastTimer = setTimeout(() => this.cerrarToast(), DEMORA_AUTOCIERRE_TOAST_MS);
  }

  cerrarToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastVisible.set(false);
    this.toastSalidaTimer = setTimeout(() => this.toast.set(null), DEMORA_SALIDA_TOAST_MS);
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastSalidaTimer) clearTimeout(this.toastSalidaTimer);
  }

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
      complete: () => {
        this.mostrarToast('success', 'Cerrando sesión', 'Hasta pronto.');
        setTimeout(() => this.router.navigateByUrl('/auth'), DEMORA_ANTES_DE_NAVEGAR_MS);
      },
      // Si el logout en el backend falla igual limpiamos el lado del front y
      // mandamos a login: no tiene sentido dejar al usuario atascado.
      error: () => {
        this.mostrarToast(
          'warning',
          'No se pudo cerrar sesión en el servidor',
          'Se cerró tu sesión local de todas formas.',
        );
        setTimeout(() => this.router.navigateByUrl('/auth'), DEMORA_ANTES_DE_NAVEGAR_MS);
      },
    });
  }

  irACambiarContrasena() {
    this.router.navigateByUrl('/auth/forgot-password');
  }
}
