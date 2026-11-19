import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucidePencil } from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';

import { Alert, AlertTone } from '../../../../../shared/ds/alert/alert';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/ds/breadcrumb/breadcrumb';
import { Button } from '../../../../../shared/ds/button/button';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { CanalEmailCard } from '../../components/canal-email-card/canal-email-card';
import { CanalPortalCard } from '../../components/canal-portal-card/canal-portal-card';
import { PlantillaEditarModal } from '../../components/plantilla-editar-modal/plantilla-editar-modal';
import { CanalEmail, CanalPortal, PlantillaCorreo } from '../../interfaces/notificacion.interface';
import { NotificacionesService } from '../../services/notificaciones.service';

type Pestana = 'canales' | 'plantillas';

interface RowCtx {
  $implicit: PlantillaCorreo;
  index: number;
}

/** FNC-43 (RF-A185 a RF-A188): canales de envío y plantillas de correo. */
@Component({
  imports: [
    Alert,
    Breadcrumb,
    Button,
    CanalEmailCard,
    CanalPortalCard,
    CellStack,
    DataTable,
    Icon,
    IconButton,
    PlantillaEditarModal,
    Tabs,
  ],
  selector: 'app-gestionar-notificaciones',
  templateUrl: './gestionar-notificaciones.html',
})
export class GestionarNotificaciones implements OnInit, AfterViewInit {
  private service = inject(NotificacionesService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('notificacionCell', { static: true }) notificacionCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('variablesCell', { static: true }) variablesCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<RowCtx>;

  readonly LucidePencil = LucidePencil;

  protected readonly migas: BreadcrumbItem[] = [
    { label: 'Configuración' },
    { label: 'Notificaciones' },
  ];

  protected readonly pestana = signal<Pestana>('canales');
  protected readonly pestanas = computed<DsTab[]>(() => [
    { id: 'canales', label: 'Canales' },
    { id: 'plantillas', label: 'Plantillas de correo', count: this.plantillas().length },
  ]);

  // --- Carga ---
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');

  protected readonly email = signal<CanalEmail | null>(null);
  protected readonly portal = signal<CanalPortal | null>(null);
  protected readonly plantillas = signal<PlantillaCorreo[]>([]);

  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  cerrarToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = null;
    this.toast.set(null);
  }
  private mostrarToast(tone: AlertTone, title: string, description?: string): void {
    this.cerrarToast();
    this.toast.set({ tone, title, description });
    this.toastTimer = setTimeout(() => this.cerrarToast(), 4500);
  }

  protected readonly columns = signal<DsColumn[]>([
    { key: 'notificacion', header: 'Notificación' },
    { key: 'destinatario', header: 'Destinatario', width: '180px' },
    { key: 'variables', header: 'Variables' },
    { key: 'actualizada', header: 'Última edición', width: '140px', muted: true },
    { key: 'acciones', header: '', width: '60px', align: 'right' },
  ]);

  // --- Modal de edición ---
  protected readonly plantillaEnEdicion = signal<PlantillaCorreo | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.cerrarToast());
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        if (col.key === 'notificacion') return { ...col, cellTemplate: this.notificacionCellTpl };
        if (col.key === 'variables') return { ...col, cellTemplate: this.variablesCellTpl };
        if (col.key === 'acciones') return { ...col, cellTemplate: this.accionesCellTpl };
        return col;
      }),
    );
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    forkJoin({ canales: this.service.canales(), plantillas: this.service.plantillas() })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ canales, plantillas }) => {
          this.email.set(canales.email);
          this.portal.set(canales.portal);
          this.plantillas.set(plantillas);
        },
        error: (error: unknown) =>
          this.errorCarga.set(
            apiErrorMessage(error, 'No se pudieron cargar los parámetros de notificaciones.'),
          ),
      });
  }

  protected cambiarPestana(id: string): void {
    this.pestana.set(id === 'plantillas' ? 'plantillas' : 'canales');
  }

  protected cambiarCanalEmail(activo: boolean): void {
    const actual = this.email();
    if (!actual) return;
    this.email.set({ ...actual, activo });
    this.service
      .actualizarCanalEmail(activo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (email) => {
          this.email.set(email);
          this.mostrarToast('success', 'Canal de email actualizado');
        },
        error: (error: unknown) => {
          this.email.set(actual);
          this.mostrarToast(
            'error',
            apiErrorMessage(error, 'No se pudo actualizar el canal de email.'),
          );
        },
      });
  }

  protected cambiarCanalPortal(activo: boolean): void {
    const actual = this.portal();
    if (!actual) return;
    this.portal.set({ ...actual, activo });
    this.service
      .actualizarCanalPortal(activo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (portal) => {
          this.portal.set(portal);
          this.mostrarToast('success', 'Canal del portal actualizado');
        },
        error: (error: unknown) => {
          this.portal.set(actual);
          this.mostrarToast(
            'error',
            apiErrorMessage(error, 'No se pudo actualizar el canal del portal.'),
          );
        },
      });
  }

  protected editarPlantilla(plantilla: PlantillaCorreo): void {
    this.plantillaEnEdicion.set(plantilla);
  }

  protected cerrarEdicion(): void {
    this.plantillaEnEdicion.set(null);
  }

  protected plantillaGuardada(actualizada: PlantillaCorreo): void {
    this.plantillas.update((actuales) =>
      actuales.map((p) => (p.clave === actualizada.clave ? actualizada : p)),
    );
    this.mostrarToast('success', 'Plantilla actualizada', actualizada.nombre);
  }
}
