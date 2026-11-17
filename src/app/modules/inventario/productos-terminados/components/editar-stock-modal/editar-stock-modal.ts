import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucidePencil } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Alert, AlertTone } from '../../../../../shared/ds/alert/alert';
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

const DEMORA_AUTOCIERRE_TOAST_MS = 4500;

// SKU, nombre, descripcion, categoria, presentacion y stock actual se
// muestran deshabilitados, solo de referencia — el PATCH de este modulo
// unicamente acepta stock_minimo/stock_maximo (confirmado por el backend).
// Editar el resto del producto (nombre, descripcion, categoria,
// presentacion) es del modulo de catalogo, no de este.
@Component({
  imports: [Alert, Button, Field, Icon, Input, Modal, Textarea],
  selector: 'app-editar-stock-modal',
  templateUrl: './editar-stock-modal.html',
})
export class EditarStockModal implements OnDestroy {
  private productoPresentacionService = inject(ProductoPresentacionService);
  private destroyRef = inject(DestroyRef);
  private productoAnterior: ProductoPresentacion | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  /** null = cerrado. */
  producto = input<ProductoPresentacion | null>(null);
  closed = output<void>();
  saved = output<ProductoPresentacion>();

  readonly LucidePencil = LucidePencil;
  readonly etiquetaPresentacion = etiquetaPresentacion;

  stockMinimo = signal('');
  stockMaximo = signal('');

  errores = signal<EditarStockErrores>({});
  // Alerta dentro del propio modal: campos sin completar o error de la API (el formulario sigue abierto).
  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  guardando = signal(false);

  private mostrarToast(tone: AlertTone, title: string, description?: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ tone, title, description });
    this.toastTimer = setTimeout(() => this.toast.set(null), DEMORA_AUTOCIERRE_TOAST_MS);
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

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
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toast.set(null);
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

    if (Object.keys(errores).length > 0) {
      const partes: string[] = [];
      if (errores.stockMinimo) partes.push('stock mínimo');
      if (errores.stockMaximo) partes.push('stock máximo');
      this.mostrarToast('warning', 'Faltan campos por completar', `Revisa: ${partes.join(', ')}.`);
      return;
    }

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set(null);
    this.guardando.set(true);
    this.productoPresentacionService
      .actualizarStock(producto.id, form)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saved.emit(producto);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.mostrarToast('error', 'No se pudo actualizar el stock. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.mostrarToast('error', 'No tiene permisos para editar el stock.');
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
      this.mostrarToast('error', mensaje || 'No se pudo actualizar el stock. Intente nuevamente.');
      return;
    }

    this.mostrarToast('error', 'No se pudo actualizar el stock. Intente nuevamente.');
  }
}
