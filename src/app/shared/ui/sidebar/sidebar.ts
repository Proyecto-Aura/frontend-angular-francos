import { Component, Type, input, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SidebarLink {
  label: string;
  path?: string;
  icon?: Type<unknown>;
  children?: SidebarLink[];
}

@Component({
  imports: [RouterLink, RouterLinkActive, NgComponentOutlet],
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  links = input<SidebarLink[]>([]);
  sectionLabel = input<string | null>(null);

  collapsed = signal(false);
  expandedLabels = signal<Set<string>>(new Set());

  toggle() {
    this.collapsed.update((value) => !value);
  }

  isExpanded(label: string): boolean {
    return this.expandedLabels().has(label);
  }

  toggleExpanded(label: string): void {
    this.expandedLabels.update((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }
}
