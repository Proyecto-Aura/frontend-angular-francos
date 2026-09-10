import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'home-cards',
  templateUrl: './home-cards.html',
  host: { class: 'contents' },
})
export class HomeCards {
  icon = input.required<string>();
  title = input.required<string>();
  description = input.required<string>();
  routerLink = input<string | null>(null);
}
