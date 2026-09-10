import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthInput } from '../../components/auth-input/auth-input';

// TODO: esto es temporal — reemplazar por una llamada real a AuthSe
// cuando exista el backend/BD. Usuario y contraseña quedan fijos mientras tanto.
const STATIC_USERNAME = 'admin';
const STATIC_PASSWORD = 'admin123';

@Component({
  imports: [AuthInput],
  selector: 'app-auth-form-login',
  templateUrl: './auth-form-login.html',
  host: { class: 'contents' },
})
export class AuthFormLogin {
  private router = inject(Router);

  username = signal('');
  password = signal('');
  rememberSession = signal(false);
  loginError = signal(false);

  onForgotPassword() {
    // TODO: navegar a la pantalla de recuperar contraseña (auth-reset)
  }

  handleSubmit(event: Event) {
    event.preventDefault();
    this.onSubmit();
  }

  onSubmit() {
    const isValid = this.username() === STATIC_USERNAME && this.password() === STATIC_PASSWORD;

    if (!isValid) {
      this.loginError.set(true);
      return;
    }

    this.loginError.set(false);
    this.router.navigateByUrl('/home');
  }
}
