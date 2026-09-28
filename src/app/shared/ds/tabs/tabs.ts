import { Component, Type, input, output, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

export interface DsTab {
  id: string;
  label: string;
  icon?: Type<unknown>;
  count?: number;
}

@Component({
  imports: [NgComponentOutlet],
  selector: 'app-ds-tabs',
  templateUrl: './tabs.html',
})
export class Tabs {
  tabs = input<DsTab[]>([]);
  activeId = input<string | null>(null);

  changed = output<string>();

  hoverId = signal<string | null>(null);
}
