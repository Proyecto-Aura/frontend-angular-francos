import { Component, computed, input, model, signal } from '@angular/core';

export type FieldSize = 'sm' | 'md' | 'lg';
export interface SelectOption {
  value: string;
  label: string;
}

const HEIGHTS: Record<FieldSize, string> = { sm: '36px', md: '44px', lg: '48px' };

@Component({
  imports: [],
  selector: 'app-ds-select',
  templateUrl: './select.html',
  // El id va solo en el control nativo: si también quedara en el host, el
  // <label for> apuntaría al host y la etiqueta no quedaría asociada.
  host: { '[attr.id]': 'null' },
})
export class Select {
  value = model('');
  options = input<SelectOption[]>([]);
  placeholder = input<string | null>(null);
  hasIcon = input(false);
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
      'w-full box-border appearance-none font-sans text-ds-base outline-none transition-[border-color,box-shadow,background] duration-[120ms] ease-linear rounded-field pr-[38px]',
      disabled
        ? 'bg-muted text-muted-foreground cursor-not-allowed'
        : invalid
          ? 'bg-[rgba(210,43,43,0.04)] text-foreground cursor-pointer'
          : 'bg-input-background text-foreground cursor-pointer',
      invalid
        ? 'border border-destructive'
        : focused
          ? 'border border-primary'
          : 'border border-border',
      focused ? 'shadow-[var(--shadow-focus)]' : 'shadow-ds-field',
      this.hasIcon() ? 'pl-[42px]' : 'pl-[14px]',
    ].join(' ');
  });

  iconColorClass = computed(() =>
    this.invalid() ? 'text-destructive' : this.focused() ? 'text-primary' : 'text-muted-foreground',
  );

  onChange(event: Event) {
    this.value.set((event.target as HTMLSelectElement).value);
  }
}
