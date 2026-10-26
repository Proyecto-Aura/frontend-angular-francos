import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucidePencil } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import {
  EditarStockForm,
  ProductoPresentacion,
} from '../../interfaces/producto-presentacion.interface';
import { etiquetaPresentacion } from '../../mappers/producto-presentacion.mapper';
import { ProductoPresentacionService } from '../../services/producto-presentacion.service';
import { EditarStockErrores, validarEditarStockForm } from './editar-stock.validaciones';

// SKU, nombre, descripcion, categoria, presentacion y stock actual se
// muestran deshabilitados, solo de referencia — el PATCH de este modulo
// unicamente acepta stock_minimo/stock_maximo (confirmado por el backend).
// Editar el resto del producto (nombre, descripcion, categoria,
// presentacion) es del modulo de catalogo, no de este.
@Component({
  imports: [Button, Field, Icon, Input, Modal, Textarea],
  selector: 'app-editar-stock-modal',
  templateUrl: './editar-stock-modal.html',
})
export class EditarStockModal {
  private productoPresentacionService = inject(ProductoPresentacionService);
  private destroyRef = inject(DestroyRef);
  private productoAnterior: ProductoPresentacion | null = null;

  /** null = cerrado. */
  producto = input<ProductoPresentacion | null>(null);
  closed = output<void>();
  saved = output<void>();

  readonly LucidePencil = LucidePencil;
  readonly etiquetaPresentacion = etiquetaPresentacion;

  stockMinimo = signal('');
  stockMaximo = signal('');

  errores = signal<EditarStockErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    // Prellena con los valores actuales cada vez que se abre para un
    // producto nuevo (no en cada change detection — productoAnterior evita
    // pisar lo que la persona ya esta escribiendo).
    effect(() => {
      const producto = this.producto();
      if (producto && producto !== this.productoAnterior) {
        this.stockMinimo.set(String(producto.stockMinimo));
        this.stockMaximo.set(producto.stockMaximo !== null ? String(producto.stockMaximo) : '');
        this.errores.set({});
        this.errorGeneral.set(null);
      }
      this.productoAnterior = producto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  guardar(): void {
    const producto = this.producto();
    if (!producto) return;

    const form: EditarStockForm = {
      stockMinimo: this.stockMinimo().trim(),
      stockMaximo: this.stockMaximo().trim(),
    };
    const errores = validarEditarStockForm(form);
    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) return;

    this.guardando.set(true);
    this.productoPresentacionService
      .actualizarStock(producto.id, form)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saved.emit();
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo actualizar el stock. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para editar el stock.');
      return;
    }

    const apiError = error.error as { message?: string | string[] } | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');

    if (error.status === 400 || error.status === 404 || error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo actualizar el stock. Intente nuevamente.');
      return;
    }

    this.errorGeneral.set('No se pudo actualizar el stock. Intente nuevamente.');
  }
}
