import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { Button } from '../../../../../shared/ds/button/button';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { Usuario } from '../../interfaces/usuario.interface';
import { UsuariosService } from '../../services/usuarios.service';

@Component({
  imports: [Button, Modal],
  selector: 'app-usuario-desactivar-modal',
  templateUrl: './usuario-desactivar-modal.html',
})
export class UsuarioDesactivarModal {
  private usuariosService = inject(UsuariosService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  usuario = input<Usuario | null>(null);
  closed = output<void>();
  deactivated = output<Usuario>();

  readonly desactivando = signal(false);
  readonly errorGeneral = signal('');

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.desactivando.set(false);
        this.errorGeneral.set('');
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  protected cerrar(): void {
    this.closed.emit();
  }

  protected desactivar(): void {
    const usuario = this.usuario();
    if (!usuario) return;

    this.desactivando.set(true);
    this.errorGeneral.set('');
    this.usuariosService
      .desactivar(usuario.id)
      .pipe(
        finalize(() => this.desactivando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (desactivado) => {
          this.deactivated.emit(desactivado);
          this.closed.emit();
        },
        // El backend no deja desactivar al propio usuario ni al último admin.
        error: (error: unknown) =>
          this.errorGeneral.set(
            apiErrorMessage(error, 'No se pudo desactivar el usuario. Intente nuevamente.'),
          ),
      });
  }
}
