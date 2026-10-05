import { Component, computed, input, model, signal } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-textarea',
  templateUrl: './textarea.html',
})
export class Textarea {
  value = model('');
  placeholder = input('');
  rows = input(4);
  invalid = input(false);
  disabled = input(false);
  id = input<string | null>(null);
  name = input<string | null>(null);

  focused = signal(false);

  classes = computed(() => {
    const invalid = this.invalid();
    const focused = this.focused();
    const disabled = this.disabled();
    return [
      'w-full box-border font-sans text-ds-base leading-normal outline-none transition-[border-color,box-shadow,background] duration-[120ms] ease-linear rounded-field px-[14px] py-[12px] resize-y',
      disabled ? 'bg-muted text-muted-foreground' : invalid ? 'bg-[rgba(210,43,43,0.04)] text-foreground' : 'bg-input-background text-foreground',
      invalid ? 'border border-destructive' : focused ? 'border border-primary' : 'border border-border',
      focused ? 'shadow-[var(--shadow-focus)]' : 'shadow-ds-field',
    ].join(' ');
  });

  onInput(event: Event) {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}
