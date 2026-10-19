import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { form, required, FormField, FormRoot } from '@angular/forms/signals';
import { AuthInput } from '../../components/auth-input/auth-input';
import { Button } from '../../../../shared/ds/button/button';
import { AuthService } from '../../services/auth.service';

const LOGIN_ERROR_FALLBACK = 'No se pudo iniciar sesión. Intenta de nuevo.';

@Component({
  imports: [AuthInput, Button, FormField, FormRoot],
  selector: 'app-auth-form-login',
  templateUrl: './auth-form-login.html',
  host: { class: 'contents' },
})
export class AuthFormLogin {
  private router = inject(Router);
  private authService = inject(AuthService);

  rememberSession = signal(false);
  loginError = signal<string | null>(null);

  loginModel = signal({ username: '', password: '' });

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
            this.loginError.set(null);
            this.router.navigateByUrl('/home');
          } catch (error) {
            const message =
              error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
                ? error.error.message
                : LOGIN_ERROR_FALLBACK;
            this.loginError.set(message);
          }
        },
      },
    },
  );

  onForgotPassword() {
    // TODO: navegar a la pantalla de recuperar contraseña (auth-reset)
  }
}
