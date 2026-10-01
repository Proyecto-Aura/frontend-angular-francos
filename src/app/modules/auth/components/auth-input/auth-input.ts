import { Component, computed, input, model, output, signal } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { LucideDynamicIcon, LucideEye, LucideEyeClosed } from '@lucide/angular';
import { Input } from '../../../../shared/ds/input/input';

@Component({
  imports: [LucideDynamicIcon, Input],
  selector: 'app-auth-input',
  templateUrl: './auth-input.html',
})
export class AuthInput implements FormValueControl<string> {
  private static nextId = 0;
  protected readonly inputId = `auth-input-${AuthInput.nextId++}`;

  label = input('');
  placeholder = input('');
  type = input<'text' | 'password'>('text');
  forgotPasswordText = input<string | null>(null);

  value = model('');
  isDisabled = input(false);
  forgotPasswordClick = output<void>();

  passwordVisible = signal(false);

  eye = computed(() => this.passwordVisible() ? LucideEyeClosed : LucideEye);

  togglePasswordVisible() {
    this.passwordVisible.update(v => !v);
  }
}
