import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-header',
  templateUrl: './header.html',
})
export class Header {
  userName = input('');
  userRole = input('');
  avatarUrl = input<string | null>(null);
}
