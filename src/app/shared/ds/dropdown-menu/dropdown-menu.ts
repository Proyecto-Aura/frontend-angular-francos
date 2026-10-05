import { Component, ElementRef, HostListener, Type, inject, input, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

export interface DropdownMenuItem {
  label?: string;
  icon?: Type<unknown>;
  destructive?: boolean;
  separator?: boolean;
  onSelect?: () => void;
}

@Component({
  imports: [NgComponentOutlet],
  selector: 'app-ds-dropdown-menu',
  templateUrl: './dropdown-menu.html',
})
export class DropdownMenu {
  items = input<DropdownMenuItem[]>([]);
  align = input<'left' | 'right'>('right');

  open = signal(false);
  hoverIndex = signal(-1);

  private host = inject(ElementRef<HTMLElement>);

  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(event: MouseEvent) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  toggle() {
    this.open.update((o) => !o);
  }

  select(item: DropdownMenuItem) {
    this.open.set(false);
    item.onSelect?.();
  }

  itemClasses(item: DropdownMenuItem, index: number): string {
    const hovered = this.hoverIndex() === index;
    const base = 'flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md border-none px-2.5 text-left text-ds-base font-normal';
    const bg = hovered ? (item.destructive ? 'bg-[rgba(229,57,53,0.08)]' : 'bg-accent') : 'bg-transparent';
    const fg = item.destructive ? 'text-destructive' : hovered ? 'text-accent-foreground' : 'text-foreground';
    return [base, bg, fg].join(' ');
  }
}
