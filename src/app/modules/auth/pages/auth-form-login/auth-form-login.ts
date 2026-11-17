import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { form, required, FormField, FormRoot } from '@angular/forms/signals';
import { AuthInput } from '../../components/auth-input/auth-input';
import { Alert, AlertTone } from '../../../../shared/ds/alert/alert';
import { Button } from '../../../../shared/ds/button/button';
import { AuthService } from '../../services/auth.service';

const LOGIN_ERROR_FALLBACK = 'No se pudo iniciar sesión. Intenta de nuevo.';
// Tiempo para que se alcance a ver el toast de éxito antes de salir de esta pantalla.
const DEMORA_ANTES_DE_NAVEGAR_MS = 700;
const DEMORA_AUTOCIERRE_TOAST_MS = 4500;
const DEMORA_SALIDA_TOAST_MS = 300;

@Component({
  imports: [Alert, AuthInput, Button, FormField, FormRoot],
  selector: 'app-auth-form-login',
  templateUrl: './auth-form-login.html',
  host: { class: 'contents' },
})
export class AuthFormLogin implements OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);

  rememberSession = signal(false);
  // Tras restablecer la contraseña se llega aquí con ?restablecida=1.
  passwordReset = inject(ActivatedRoute).snapshot.queryParamMap.get('restablecida') === '1';

  loginModel = signal({ username: '', password: '' });

  // Toast flotante arriba a la derecha: éxito (verde), error de credenciales (rojo)
  // o campos sin rellenar (amarillo). Entra deslizando desde la derecha y, al
  // esconderse (sola o por la X), vuelve a salir por donde entró.
  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  toastVisible = signal(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private toastSalidaTimer: ReturnType<typeof setTimeout> | null = null;

  loginForm = form(
    this.loginModel,
    (path) => {
      required(path.username, { message: 'El usuario es obligatorio' });
      required(path.password, { message: 'La contraseña es obligatoria' });
    },
    {
      submission: {
        action: async (field) => {
          const { username, password } = field().value();
          try {
            await firstValueFrom(this.authService.login(username, password));
            this.mostrarToast('success', 'Inicio de sesión exitoso', `Bienvenido, ${username}.`);
            setTimeout(() => this.router.navigateByUrl('/home'), DEMORA_ANTES_DE_NAVEGAR_MS);
          } catch (error) {
            const message =
              error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
                ? error.error.message
                : LOGIN_ERROR_FALLBACK;
            this.mostrarToast('error', message);
          }
        },
        onInvalid: (field) => {
          field().markAsTouched();
          this.mostrarToast(
            'warning',
            'Faltan campos por completar',
            'Ingresa tu usuario y tu contraseña para continuar.',
          );
        },
      },
    },
  );

  private mostrarToast(tone: AlertTone, title: string, description?: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.toastSalidaTimer) clearTimeout(this.toastSalidaTimer);

    this.toast.set({ tone, title, description });
    this.toastVisible.set(false);
    // Doble rAF: deja pintar la posicion inicial (fuera de pantalla) antes de
    // animar hacia el centro, si no el navegador no anima el primer cambio.
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

  onForgotPassword() {
    this.router.navigateByUrl('/auth/forgot-password');
  }
}
