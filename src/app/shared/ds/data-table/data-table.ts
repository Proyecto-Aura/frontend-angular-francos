import { Component, TemplateRef, computed, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface DsColumn {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  muted?: boolean;
  numeric?: boolean;
  wrap?: boolean;
  cellTemplate?: TemplateRef<{ $implicit: unknown; index: number }>;
}

@Component({
  imports: [NgTemplateOutlet],
  selector: 'app-ds-data-table',
  templateUrl: './data-table.html',
})
export class DataTable {
  columns = input<DsColumn[]>([]);
  rows = input<unknown[]>([]);
  selectable = input(false);
  empty = input('Sin resultados');

  rowClicked = output<{ row: unknown; index: number }>();

  hoverIndex = signal(-1);
  colSpan = computed(() => this.columns().length + (this.selectable() ? 1 : 0));

  onRowClick(row: unknown, index: number) {
    this.rowClicked.emit({ row, index });
  }

  cellValue(row: unknown, key: string) {
    return (row as Record<string, unknown>)[key];
  }
}
