import { Component, computed, input, signal } from '@angular/core';

export type TooltipPlacement = 'top' | 'bottom';

@Component({
  imports: [],
  selector: 'app-ds-tooltip',
  templateUrl: './tooltip.html',
})
export class Tooltip {
  label = input('');
  placement = input<TooltipPlacement>('top');

  open = signal(false);

  positionClass = computed(() =>
    this.placement() === 'bottom' ? 'top-[calc(100%+6px)]' : 'bottom-[calc(100%+6px)]',
  );
}
