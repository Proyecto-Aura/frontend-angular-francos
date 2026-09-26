import { Component, computed, input, model, output, signal } from '@angular/core';
import { LucideDynamicIcon, LucideEye, LucideEyeOff, LucideEyeClosed } from '@lucide/angular';

@Component({
  imports: [LucideDynamicIcon],
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

  eye = computed(() => this.passwordVisible() ? LucideEyeClosed : LucideEye);

  togglePasswordVisible() {
    this.passwordVisible.update(v => !v);
  }
}
