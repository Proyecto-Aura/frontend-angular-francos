import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideDownload, LucideFileText } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { DocumentoEstrategico } from '../../interfaces/documento-estrategico.interface';
import { DocumentoEstrategicoService } from '../../services/documento-estrategico.service';
import {
  extension,
  tieneVistaPrevia,
} from '../documento-estrategico-subir-modal/documento-estrategico.archivo';

@Component({
  imports: [Button, Icon, Modal],
  selector: 'app-documento-estrategico-ver-modal',
  templateUrl: './documento-estrategico-ver-modal.html',
})
export class DocumentoEstrategicoVerModal {
  private documentoService = inject(DocumentoEstrategicoService);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  private documentoCargadoId: number | null = null;
  private solicitudActual = 0;

  open = input(false);
  documento = input<DocumentoEstrategico | null>(null);
  closed = output<void>();

  readonly LucideDownload = LucideDownload;
  readonly LucideFileText = LucideFileText;
  readonly cargando = signal(false);
  readonly error = signal(false);
  readonly documentoActual = signal<DocumentoEstrategico | null>(null);
  readonly urlSegura = signal<SafeResourceUrl | null>(null);
  readonly tipoVistaPrevia = computed(() =>
    extension(this.documentoActual()?.nombreOriginal ?? ''),
  );
  readonly puedeVistaPrevia = computed(() => tieneVistaPrevia(this.tipoVistaPrevia()));

  constructor() {
    effect(() => {
      const abierto = this.open();
      const documentoId = this.documento()?.id ?? null;
      if (!abierto) {
        this.documentoCargadoId = null;
        this.documentoActual.set(null);
        this.urlSegura.set(null);
        return;
      }
      if (documentoId !== null && documentoId !== this.documentoCargadoId) {
        this.cargarDocumento(documentoId);
      }
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  formatearFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
  }

  private cargarDocumento(id: number): void {
    const solicitud = ++this.solicitudActual;
    this.documentoCargadoId = id;
    this.cargando.set(true);
    this.error.set(false);
    this.documentoActual.set(null);
    this.urlSegura.set(null);
    this.documentoService
      .obtener(id)
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudActual) this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (documento) => {
          if (solicitud !== this.solicitudActual) return;
          this.documentoActual.set(documento);
          if (documento.url) {
            this.urlSegura.set(this.sanitizer.bypassSecurityTrustResourceUrl(documento.url));
          } else {
            this.error.set(true);
          }
        },
        error: () => {
          if (solicitud === this.solicitudActual) this.error.set(true);
        },
      });
  }
}
