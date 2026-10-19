import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-filter-bar',
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  hasSearch = input(false);
  hasActions = input(false);
  bare = input(false);
}
