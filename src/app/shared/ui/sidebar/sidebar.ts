import { Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SidebarLink {
  label: string;
  path?: string;
  icon?: string;
  children?: SidebarLink[];
}

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
})
export class Sidebar {
  links = input<SidebarLink[]>([]);

  collapsed = signal(false);
  expandedLabels = signal<Set<string>>(new Set());

  toggle() {
    this.collapsed.update(value => !value);
  }

  isExpanded(label: string): boolean {
    return this.expandedLabels().has(label);
  }

  toggleExpanded(label: string): void {
    this.expandedLabels.update(current => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }
}
