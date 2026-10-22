import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { DocumentoEstrategicoApiErrorDto } from '../../../negocio/interfaces/documento-estrategico-dto.interface';
import { DocumentoEstrategico } from '../../../negocio/interfaces/documento-estrategico.interface';
import { DocumentoEstrategicoTiService } from '../../services/documento-estrategico-ti.service';

@Component({
  imports: [Button, Modal],
  selector: 'app-documento-estrategico-ti-eliminar-modal',
  templateUrl: './documento-estrategico-ti-eliminar-modal.html',
})
export class DocumentoEstrategicoTiEliminarModal {
  private documentoService = inject(DocumentoEstrategicoTiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  documento = input<DocumentoEstrategico | null>(null);
  closed = output<void>();
  deleted = output<void>();

  readonly eliminando = signal(false);
  readonly errorGeneral = signal<string | null>(null);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.eliminando.set(false);
        this.errorGeneral.set(null);
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  eliminar(): void {
    const documento = this.documento();
    if (!documento) return;

    this.eliminando.set(true);
    this.errorGeneral.set(null);
    this.documentoService
      .eliminar(documento.id)
      .pipe(
        finalize(() => this.eliminando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.deleted.emit();
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo eliminar el documento. Intente nuevamente.');
      return;
    }
    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar documentos estratégicos.');
      return;
    }
    if (error.status === 409) {
      const apiError = error.error as Partial<DocumentoEstrategicoApiErrorDto> | null;
      const mensaje = Array.isArray(apiError?.message)
        ? apiError.message.join(' ')
        : (apiError?.message ?? '');
      this.errorGeneral.set(mensaje || 'No se pudo eliminar el documento. Intente nuevamente.');
      return;
    }
    this.errorGeneral.set('No se pudo eliminar el documento. Intente nuevamente.');
  }
}
