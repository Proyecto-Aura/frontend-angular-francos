import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  form,
  FormField,
  FormRoot,
  maxLength,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { AuthInput } from '../../components/auth-input/auth-input';
import { Button } from '../../../../shared/ds/button/button';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { AuthService } from '../../services/auth.service';

// Mismo rango que exige el backend para la nueva contraseña.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 255;

const RESET_ERROR_FALLBACK = 'No pudimos cambiar tu contraseña. Inténtalo de nuevo.';

@Component({
  imports: [AuthInput, Button, FormField, FormRoot, RouterLink],
  selector: 'app-auth-reset',
  templateUrl: './auth-reset.html',
  host: { class: 'contents' },
})
export class AuthReset {
  private router = inject(Router);
  private authService = inject(AuthService);

  // Llega en el enlace del correo (/reset-password?token=…). Sin token no hay
  // nada que enviar: la pantalla solo ofrece pedir un enlace nuevo.
  token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';
  minLength = MIN_PASSWORD_LENGTH;

  resetError = signal<string | null>(null);

  resetModel = signal({ password: '', confirm: '' });

  resetForm = form(
    this.resetModel,
    (path) => {
      required(path.password, { message: 'Ingresa tu nueva contraseña' });
      minLength(path.password, MIN_PASSWORD_LENGTH, {
        message: `Debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      });
      maxLength(path.password, MAX_PASSWORD_LENGTH, { message: 'Es demasiado larga' });
      required(path.confirm, { message: 'Confirma tu nueva contraseña' });
      validate(path.confirm, ({ value, valueOf }) =>
        value() !== '' && value() !== valueOf(path.password)
          ? { kind: 'mismatch', message: 'Las contraseñas no coinciden' }
          : null,
      );
    },
    {
      submission: {
        action: async (field) => {
          const { password, confirm } = field().value();
          this.resetError.set(null);
          try {
            await firstValueFrom(
              this.authService.resetPassword({
                token: this.token,
                nueva_contrasena: password,
                confirmar_contrasena: confirm,
              }),
            );
            // El login muestra el aviso de que ya puede iniciar sesión.
            await this.router.navigate(['/auth/login'], {
              queryParams: { restablecida: 1 },
              replaceUrl: true,
            });
          } catch (error) {
            this.resetError.set(apiErrorMessage(error, RESET_ERROR_FALLBACK));
          }
        },
      },
    },
  );
}
