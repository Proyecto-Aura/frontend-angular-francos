import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { email, form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { AuthInput } from '../../components/auth-input/auth-input';
import { Button } from '../../../../shared/ds/button/button';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { AuthService } from '../../services/auth.service';

const FORGOT_ERROR_FALLBACK = 'No pudimos enviar el enlace. Inténtalo de nuevo en unos minutos.';

@Component({
  imports: [AuthInput, Button, FormField, FormRoot, RouterLink],
  selector: 'app-auth-forgot-password',
  templateUrl: './auth-forgot-password.html',
  host: { class: 'contents' },
})
export class AuthForgotPassword {
  private authService = inject(AuthService);

  forgotError = signal<string | null>(null);
  // Mensaje genérico del backend: es el mismo exista o no el correo.
  sentMessage = signal<string | null>(null);

  forgotModel = signal({ email: '' });

  forgotForm = form(
    this.forgotModel,
    (path) => {
      required(path.email, { message: 'El correo es obligatorio' });
      email(path.email, { message: 'Ingresa un correo electrónico válido' });
      maxLength(path.email, 150, { message: 'El correo no puede pasar de 150 caracteres' });
    },
    {
      submission: {
        action: async (field) => {
          this.forgotError.set(null);
          try {
            const { message } = await firstValueFrom(
              this.authService.forgotPassword(field().value().email),
            );
            this.sentMessage.set(message);
          } catch (error) {
            this.forgotError.set(apiErrorMessage(error, FORGOT_ERROR_FALLBACK));
          }
        },
      },
    },
  );
}
