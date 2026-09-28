import { Component, input } from '@angular/core';

export type UserPlacement = 'left' | 'right';

@Component({
  imports: [],
  selector: 'app-ds-topbar',
  templateUrl: './topbar.html',
})
export class Topbar {
  title = input<string | null>(null);
  hasBreadcrumb = input(false);
  hasSearch = input(false);
  hasActions = input(false);
  hasUser = input(false);
  userPlacement = input<UserPlacement>('right');
}
