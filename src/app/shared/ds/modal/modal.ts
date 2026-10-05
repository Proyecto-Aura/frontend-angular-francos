import { Component, input, output } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-ds-modal',
  templateUrl: './modal.html',
})
export class Modal {
  open = input(true);
  title = input<string | null>(null);
  description = input<string | null>(null);
  hasIcon = input(false);
  hint = input<string | null>(null);
  hasFooter = input(false);
  width = input(480);
  closable = input(true);

  closed = output<void>();

  onClose() {
    if (this.closable()) this.closed.emit();
  }
}
