import { Component, signal } from '@angular/core';
import { AuthInput } from '../../components/auth-input/auth-input';

@Component({
  imports: [AuthInput],
  selector: 'app-auth-form-login',
  templateUrl: './auth-form-login.html',
  host: { class: 'contents' },
})
export class AuthFormLogin {
  username = signal('');
  password = signal('');
  rememberSession = signal(false);

  onForgotPassword() {
    // TODO: navegar a la pantalla de recuperar contraseña (auth-reset)
  }

  onSubmit() {
    // TODO: conectar con AuthService cuando exista
  }
}
