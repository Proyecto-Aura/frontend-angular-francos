import { Component, input, model, output, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'auth-input',
  templateUrl: './auth-input.html',
})
export class AuthInput {
  label = input('');
  placeholder = input('');
  type = input<'text' | 'password'>('text');
  forgotPasswordText = input<string | null>(null);

  value = model('');
  forgotPasswordClick = output<void>();

  passwordVisible = signal(false);

  togglePasswordVisible() {
    this.passwordVisible.update(value => !value);
  }
}
