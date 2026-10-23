import {
  AfterViewInit,
  Component,
  DestroyRef,
  TemplateRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  LucideEye,
  LucideFolderOpen,
  LucideLock,
  LucideTrash2,
  LucideUpload,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { PlanSeleccionadoService } from '../../../plan-estrategico/services/plan-seleccionado.service';
import { DocumentoEstrategicoTiEliminarModal } from '../../components/documento-estrategico-ti-eliminar-modal/documento-estrategico-ti-eliminar-modal';
import { DocumentoEstrategicoTiSubirModal } from '../../components/documento-estrategico-ti-subir-modal/documento-estrategico-ti-subir-modal';
import { DocumentoEstrategicoTiVerModal } from '../../components/documento-estrategico-ti-ver-modal/documento-estrategico-ti-ver-modal';
import { DocumentoEstrategico } from '../../../negocio/interfaces/documento-estrategico.interface';
import { DocumentoEstrategicoTiService } from '../../services/documento-estrategico-ti.service';

@Component({
  imports: [
    Badge,
    Button,
    Card,
    DataTable,
    DocumentoEstrategicoTiEliminarModal,
    DocumentoEstrategicoTiSubirModal,
    DocumentoEstrategicoTiVerModal,
    Icon,
    IconButton,
    Pagination,
    RouterLink,
  ],
  selector: 'app-analisis-estrategico-ti',
  templateUrl: './analisis-estrategico-ti.html',
})
export class AnalisisEstrategicoTiPage implements AfterViewInit {
  @ViewChild('documentoCell', { static: true })
  documentoCellTpl!: TemplateRef<{ $implicit: DocumentoEstrategico; index: number }>;

  @ViewChild('tipoCell', { static: true })
  tipoCellTpl!: TemplateRef<{ $implicit: DocumentoEstrategico; index: number }>;

  @ViewChild('fechaCell', { static: true })
  fechaCellTpl!: TemplateRef<{ $implicit: DocumentoEstrategico; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: DocumentoEstrategico; index: number }>;

  private documentoService = inject(DocumentoEstrategicoTiService);
  private destroyRef = inject(DestroyRef);
  private solicitudActual = 0;

  readonly planSeleccionado = inject(PlanSeleccionadoService);
  readonly LucideEye = LucideEye;
  readonly LucideFolderOpen = LucideFolderOpen;
  readonly LucideLock = LucideLock;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideUpload = LucideUpload;
  readonly columnas = signal<DsColumn[]>([
    { key: 'documento', header: 'Documento', width: '55%' },
    { key: 'tipo', header: 'Tipo', width: '15%' },
    { key: 'subido', header: 'Subido', width: '18%' },
    { key: 'acciones', header: 'Acciones', align: 'right', width: '12%' },
  ]);
  readonly documentos = signal<DocumentoEstrategico[]>([]);
  readonly pagina = signal(1);
  readonly limite = signal(10);
  readonly total = signal(0);
  readonly totalPaginas = signal(1);
  readonly cargando = signal(false);
  readonly errorCarga = signal(false);
  readonly documentoSeleccionado = signal<DocumentoEstrategico | null>(null);
  readonly modalActivo = signal<'subir' | 'ver' | 'eliminar' | null>(null);

  constructor() {
    effect(() => {
      const planId = this.planSeleccionado.planId();
      this.pagina.set(1);
      this.documentos.set([]);
      this.total.set(0);
      this.totalPaginas.set(1);
      this.cargarDocumentos(planId, 1);
    });
  }

  ngAfterViewInit(): void {
    this.columnas.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'documento') return { ...columna, cellTemplate: this.documentoCellTpl };
        if (columna.key === 'tipo') return { ...columna, cellTemplate: this.tipoCellTpl };
        if (columna.key === 'subido') return { ...columna, cellTemplate: this.fechaCellTpl };
        if (columna.key === 'acciones') return { ...columna, cellTemplate: this.accionesCellTpl };
        return columna;
      }),
    );
  }

  cargarDocumentos(
    planId: number | null = this.planSeleccionado.planId(),
    pagina = this.pagina(),
  ): void {
    const solicitud = ++this.solicitudActual;
    if (planId === null) {
      this.cargando.set(false);
      this.errorCarga.set(false);
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set(false);
    this.documentoService
      .listar(planId, pagina, this.limite())
      .pipe(
        finalize(() => {
          if (solicitud === this.solicitudActual) this.cargando.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          if (solicitud !== this.solicitudActual) return;
          this.documentos.set(resultado.documentos);
          this.pagina.set(resultado.pagina);
          this.limite.set(resultado.limite);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.totalPaginas);
        },
        error: () => {
          if (solicitud !== this.solicitudActual) return;
          this.documentos.set([]);
          this.errorCarga.set(true);
        },
      });
  }

  cambiarPagina(pagina: number): void {
    this.cargarDocumentos(this.planSeleccionado.planId(), pagina);
  }

  abrirSubida(): void {
    this.modalActivo.set('subir');
  }

  abrirVista(documento: DocumentoEstrategico): void {
    this.documentoSeleccionado.set(documento);
    this.modalActivo.set('ver');
  }

  abrirVistaDesdeFila(evento: { row: unknown }): void {
    this.abrirVista(evento.row as DocumentoEstrategico);
  }

  abrirEliminacion(event: MouseEvent, documento: DocumentoEstrategico): void {
    event.stopPropagation();
    this.documentoSeleccionado.set(documento);
    this.modalActivo.set('eliminar');
  }

  cerrarModal(): void {
    this.modalActivo.set(null);
    this.documentoSeleccionado.set(null);
  }

  documentoSubido(): void {
    this.cerrarModal();
    this.cargarDocumentos(this.planSeleccionado.planId(), 1);
  }

  documentoEliminado(): void {
    const paginaDestino =
      this.documentos().length === 1 && this.pagina() > 1 ? this.pagina() - 1 : this.pagina();
    this.cerrarModal();
    this.cargarDocumentos(this.planSeleccionado.planId(), paginaDestino);
  }

  formatearFecha(fecha: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(fecha);
  }
}
