import { Component, Type, input, output, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

export interface DsSidebarItem {
  id: string;
  label: string;
  icon?: Type<unknown>;
  badge?: string;
  children?: DsSidebarItem[];
}

export interface DsSidebarSection {
  label?: string;
  items: DsSidebarItem[];
}

/** Port of navigation/Sidebar.jsx — the design-system sidebar. Distinct from the app's own app-sidebar. */
@Component({
  imports: [NgComponentOutlet],
  selector: 'app-ds-sidebar',
  templateUrl: './sidebar.html',
})
export class DsSidebar {
  logoSrc = input<string | null>(null);
  product = input("Franco's");
  subtitle = input('Portal Empresarial');
  sections = input<DsSidebarSection[]>([]);
  activeId = input<string | null>(null);
  hasFooter = input(false);

  navigate = output<string>();

  hoverId = signal<string | null>(null);
  expandedIds = signal<Set<string>>(new Set());

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpanded(id: string): void {
    this.expandedIds.update(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  onItemClick(item: DsSidebarItem): void {
    if (item.children?.length) {
      this.toggleExpanded(item.id);
    } else {
      this.navigate.emit(item.id);
    }
  }
}
