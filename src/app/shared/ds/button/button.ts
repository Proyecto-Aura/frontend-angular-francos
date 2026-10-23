import { Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium transition-[background,border-color,color] duration-[120ms] ease-linear enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-(--control-height-sm) px-[10px] text-ds-sm',
  md: 'h-(--control-height) px-[14px] text-ds-base',
  lg: 'h-(--control-height-lg) px-[18px] text-ds-base',
};

// El color de borde vive solo aca (nunca en BASE) para que cada variante
// tenga una unica clase border-* — si BASE y una variante aportan dos
// clases border-* a la vez (p.ej. border-transparent + border-border), cual
// gana depende del orden en que Tailwind genera el CSS, no del orden en el
// string de clases, y terminaba ocultando el borde del boton secondary.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground border-transparent enabled:hover:bg-primary-hover',
  secondary: 'bg-card text-foreground border-border enabled:hover:bg-muted',
  ghost:
    'bg-transparent text-foreground border-transparent enabled:hover:bg-accent enabled:hover:text-accent-foreground',
  destructive:
    'bg-destructive text-destructive-foreground border-transparent enabled:hover:bg-[#CE322F]',
  link: 'bg-transparent text-primary border-transparent !h-auto !p-0 enabled:hover:underline',
};

@Component({
  imports: [],
  selector: 'app-ds-button',
  templateUrl: './button.html',
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input(false);
  fullWidth = input(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  clicked = output<MouseEvent>();

  classes = computed(() => {
    const v = this.variant();
    return [
      BASE,
      v === 'link' ? '' : SIZES[this.size()],
      VARIANTS[v],
      this.fullWidth() ? 'w-full' : '',
    ]
      .filter(Boolean)
      .join(' ');
  });

  onClick(event: MouseEvent) {
    if (!this.disabled()) this.clicked.emit(event);
  }
}
