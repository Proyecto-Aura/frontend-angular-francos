import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideFileText, LucideUpload, LucideX } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { DocumentoEstrategicoApiErrorDto } from '../../interfaces/documento-estrategico-dto.interface';
import { DocumentoEstrategico } from '../../interfaces/documento-estrategico.interface';
import { DocumentoEstrategicoService } from '../../services/documento-estrategico.service';
import {
  ACCEPT,
  formatearTamano as formatearTamanoArchivo,
  nombreSinExtension,
  validarArchivo,
} from './documento-estrategico.archivo';

@Component({
  imports: [Button, Field, Icon, IconButton, Input, Modal],
  selector: 'app-documento-estrategico-subir-modal',
  templateUrl: './documento-estrategico-subir-modal.html',
})
export class DocumentoEstrategicoSubirModal {
  private documentoService = inject(DocumentoEstrategicoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  planId = input<number | null>(null);
  planNombre = input('');
  closed = output<void>();
  saved = output<DocumentoEstrategico>();

  readonly ACCEPT = ACCEPT;
  readonly LucideFileText = LucideFileText;
  readonly LucideUpload = LucideUpload;
  readonly LucideX = LucideX;
  readonly formatearTamano = formatearTamanoArchivo;
  readonly nombre = signal('');
  readonly archivo = signal<File | null>(null);
  readonly errorNombre = signal<string | null>(null);
  readonly errorArchivo = signal<string | null>(null);
  readonly errorGeneral = signal<string | null>(null);
  readonly arrastrando = signal(false);
  readonly guardando = signal(false);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) this.inicializarFormulario();
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  seleccionarArchivo(event: Event): void {
    const inputArchivo = event.target as HTMLInputElement;
    const [archivo] = Array.from(inputArchivo.files ?? []);
    if (archivo) this.asignarArchivo(archivo);
    inputArchivo.value = '';
  }

  arrastrarSobre(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(true);
  }

  salirArrastre(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
  }

  soltarArchivo(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
    const [archivo] = Array.from(event.dataTransfer?.files ?? []);
    if (archivo) this.asignarArchivo(archivo);
  }

  quitarArchivo(): void {
    this.archivo.set(null);
    this.errorArchivo.set(null);
  }

  guardar(): void {
    const nombre = this.nombre().trim();
    const archivo = this.archivo();
    this.errorNombre.set(
      !nombre
        ? 'El nombre es obligatorio.'
        : nombre.length > 200
          ? 'El nombre no puede superar los 200 caracteres.'
          : null,
    );
    this.errorArchivo.set(archivo ? null : 'Selecciona un archivo.');
    this.errorGeneral.set(null);
    if (!nombre || nombre.length > 200 || !archivo) return;

    const planId = this.planId();
    if (planId === null) {
      this.errorGeneral.set('No se pudo subir el documento. Intente nuevamente.');
      return;
    }

    this.guardando.set(true);
    this.documentoService
      .subir(planId, nombre, archivo)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (documento) => {
          this.saved.emit(documento);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private asignarArchivo(archivo: File): void {
    const error = validarArchivo(archivo);
    this.errorArchivo.set(error);
    if (error) {
      this.archivo.set(null);
      return;
    }
    this.archivo.set(archivo);
    if (!this.nombre().trim()) this.nombre.set(nombreSinExtension(archivo.name));
  }

  private inicializarFormulario(): void {
    this.nombre.set('');
    this.archivo.set(null);
    this.errorNombre.set(null);
    this.errorArchivo.set(null);
    this.errorGeneral.set(null);
    this.arrastrando.set(false);
    this.guardando.set(false);
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo subir el documento. Intente nuevamente.');
      return;
    }

    const mensaje = this.mensajeDeError(error);
    const mensajeNormalizado = mensaje.toLocaleLowerCase('es');
    if (error.status === 409 && mensajeNormalizado.includes('nombre')) {
      this.errorNombre.set('Ya existe un documento con este nombre en el plan.');
      return;
    }
    if (error.status === 409 && mensajeNormalizado.includes('borrador')) {
      this.errorGeneral.set(mensaje);
      return;
    }
    if (error.status === 400) {
      this.errorArchivo.set(mensaje || 'No se pudo subir el documento. Intente nuevamente.');
      return;
    }
    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar documentos estratégicos.');
      return;
    }
    this.errorGeneral.set('No se pudo subir el documento. Intente nuevamente.');
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    const apiError = error.error as Partial<DocumentoEstrategicoApiErrorDto> | null;
    return Array.isArray(apiError?.message)
      ? apiError.message.join(' ')
      : (apiError?.message ?? '');
  }
}
