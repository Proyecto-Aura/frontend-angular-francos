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
  // Igual que width, pero opcional: si no se pasa, el modal sigue limitado
  // solo por el viewport (max-h-full) como siempre. Si se pasa, pide ese
  // alto en px pero nunca mas que el viewport disponible (min() con el
  // 100% que ya daba max-h-full) — asi un modal puede pedir mas espacio sin
  // arriesgarse a salirse de la pantalla en ventanas chicas.
  maxHeight = input<number | null>(null);
  closable = input(true);

  closed = output<void>();

  onClose() {
    if (this.closable()) this.closed.emit();
  }
}
