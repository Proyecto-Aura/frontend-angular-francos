import { Component, input } from '@angular/core';

import { Avatar } from '../../ds/avatar/avatar';

@Component({
  imports: [Avatar],
  selector: 'app-header',
  templateUrl: './header.html',
})
export class Header {
  userName = input('');
  userRole = input('');
  avatarUrl = input<string | null>(null);
}
