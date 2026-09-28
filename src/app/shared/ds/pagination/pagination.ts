import { Component, computed, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-pagination',
  templateUrl: './pagination.html',
})
export class Pagination {
  page = input(1);
  pageCount = input(1);
  total = input<number | null>(null);
  pageSize = input<number | null>(null);

  changed = output<number>();

  summary = computed(() => {
    const total = this.total();
    const pageSize = this.pageSize();
    const page = this.page();
    if (total != null && pageSize != null) {
      const from = (page - 1) * pageSize + 1;
      const to = Math.min(page * pageSize, total);
      return `Mostrando ${from}-${to} de ${total}`;
    }
    return `Página ${page} de ${this.pageCount()}`;
  });

  pageList = computed<(number | '…')[]>(() => {
    const page = this.page();
    const pageCount = this.pageCount();
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const out = [1, 2, 3, 4, 5];
    const start = Math.min(Math.max(page - 2, 1), pageCount - 5);
    const mid = Array.from({ length: 5 }, (_, i) => start + i);
    const list = page <= 4 ? out : mid;
    return [...list, '…', pageCount];
  });

  goTo(page: number) {
    this.changed.emit(page);
  }
}
