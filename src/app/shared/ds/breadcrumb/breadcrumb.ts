import { Component, input, output } from '@angular/core';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

@Component({
  imports: [],
  selector: 'app-ds-breadcrumb',
  templateUrl: './breadcrumb.html',
})
export class Breadcrumb {
  items = input<BreadcrumbItem[]>([]);
  itemClick = output<BreadcrumbItem>();
}
