import { Component, computed, input, output } from '@angular/core';

export type IconButtonVariant = 'ghost' | 'secondary';
export type IconButtonSize = 'sm' | 'md' | 'lg';

const BOX: Record<IconButtonSize, number> = { sm: 32, md: 38, lg: 42 };

@Component({
  imports: [],
  selector: 'app-ds-icon-button',
  templateUrl: './icon-button.html',
})
export class IconButton {
  label = input.required<string>();
  variant = input<IconButtonVariant>('ghost');
  size = input<IconButtonSize>('md');
  disabled = input(false);

  clicked = output<MouseEvent>();

  box = computed(() => BOX[this.size()]);
  outlined = computed(() => this.variant() === 'secondary');

  classes = computed(() => {
    const outlined = this.outlined();
    return [
      'inline-flex items-center justify-center rounded-md border transition-[background,color,border-color] duration-[120ms] ease-linear enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45',
      outlined ? 'border-border bg-card' : 'border-transparent bg-transparent',
      'text-muted-foreground',
      'enabled:hover:bg-accent enabled:hover:text-accent-foreground',
    ].join(' ');
  });

  onClick(event: MouseEvent) {
    if (!this.disabled()) this.clicked.emit(event);
  }
}
