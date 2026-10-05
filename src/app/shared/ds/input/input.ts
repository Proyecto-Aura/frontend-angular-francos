import { Component, computed, input, model, signal } from '@angular/core';

export type FieldSize = 'sm' | 'md' | 'lg';

const HEIGHTS: Record<FieldSize, string> = { sm: '36px', md: '44px', lg: '48px' };

@Component({
  imports: [],
  selector: 'app-ds-input',
  templateUrl: './input.html',
})
export class Input {
  value = model('');
  placeholder = input('');
  type = input('text');
  hasIcon = input(false);
  hasSuffix = input(false);
  invalid = input(false);
  disabled = input(false);
  size = input<FieldSize>('md');
  id = input<string | null>(null);
  name = input<string | null>(null);

  focused = signal(false);
  height = computed(() => HEIGHTS[this.size()]);

  shellClasses = computed(() => {
    const invalid = this.invalid();
    const focused = this.focused();
    const disabled = this.disabled();
    return [
      'w-full box-border font-sans text-ds-base outline-none transition-[border-color,box-shadow,background] duration-[120ms] ease-linear rounded-field',
      disabled ? 'bg-muted text-muted-foreground' : invalid ? 'bg-[rgba(210,43,43,0.04)] text-foreground' : 'bg-input-background text-foreground',
      invalid ? 'border border-destructive' : focused ? 'border border-primary' : 'border border-border',
      focused ? 'shadow-[var(--shadow-focus)]' : 'shadow-ds-field',
      this.hasIcon() ? 'pl-[42px]' : 'pl-[14px]',
      this.hasSuffix() ? 'pr-[42px]' : 'pr-[14px]',
    ].join(' ');
  });

  iconColorClass = computed(() => (this.invalid() ? 'text-destructive' : this.focused() ? 'text-primary' : 'text-muted-foreground'));

  onInput(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
  }
}
