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
import {
  LucideEye,
  LucidePencil,
  LucideRotateCcw,
  LucideTrash2,
  LucideUserPlus,
} from '@lucide/angular';
import { finalize } from 'rxjs';
import { Avatar } from '../../../../../shared/ds/avatar/avatar';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { AvisoBanner } from '../../../catalogo/components/aviso-banner/aviso-banner';
import { ClienteDetalleModal } from '../../components/cliente-detalle-modal/cliente-detalle-modal';
import { ClienteFormModal } from '../../components/cliente-form-modal/cliente-form-modal';
import {
  CATEGORIA_LABEL,
  CategoriaCliente,
  Cliente,
  TIPO_DOCUMENTO_LABEL,
  nombreCliente,
} from '../../interfaces/cliente.interface';
import { ClienteService } from '../../services/cliente.service';

const MENSAJE_ERROR_ESTADO = 'No se pudo cambiar el estado del cliente. Intente nuevamente.';

@Component({
  imports: [
    Avatar,
    AvisoBanner,
    Badge,
    Button,
    Card,
    CellStack,
    ClienteDetalleModal,
    ClienteFormModal,
    DataTable,
    Icon,
    Input,
    Modal,
    Pagination,
    Select,
  ],
  selector: 'app-listar-clientes',
  templateUrl: './listar-clientes.html',
})
export class ListarClientes implements OnInit, AfterViewInit {
  private clienteService = inject(ClienteService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('codigoCell', { static: true })
  codigoCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;

  @ViewChild('clienteCell', { static: true })
  clienteCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;

  @ViewChild('documentoCell', { static: true })
  documentoCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;

  @ViewChild('categoriaCell', { static: true })
  categoriaCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;

  @ViewChild('estadoCell', { static: true })
  estadoCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;

  @ViewChild('accionesCell', { static: true })
  accionesCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;

  readonly LucideEye = LucideEye;
  readonly LucidePencil = LucidePencil;
  readonly LucideRotateCcw = LucideRotateCcw;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideUserPlus = LucideUserPlus;

  readonly nombreCliente = nombreCliente;
  readonly tamanioPagina = 5;

  readonly categoriaOptions: SelectOption[] = (
    Object.keys(CATEGORIA_LABEL) as CategoriaCliente[]
  ).map((value) => ({ value, label: CATEGORIA_LABEL[value] }));

  // El <select> solo maneja strings: 'true'/'false' se convierte al booleano
  // real en cargarClientes() (el backend exige el booleano literal).
  readonly estadoOptions: SelectOption[] = [
    { value: 'true', label: 'Activo' },
    { value: 'false', label: 'Inactivo' },
  ];

  // Los filtros van contra el backend (GET /clientes): search, estado y
  // categoria_cliente son query params reales.
  query = signal('');
  categoriaFiltro = signal('');
  estadoFiltro = signal('');

  clientes = signal<Cliente[]>([]);
  total = signal(0);
  pagina = signal(1);
  totalPaginas = signal(0);
  cargando = signal(true);
  errorCarga = signal(false);

  columnas = signal<DsColumn[]>([]);

  /** El pie ("n de N clientes" y paginación) solo aparece cuando hay resultados que contar. */
  mostrarPie = computed(() => !this.cargando() && !this.errorCarga() && this.total() > 0);

  aviso = signal('');
  avisoTono = signal<'ok' | 'error'>('ok');

  modalFormAbierto = signal(false);
  clienteEnEdicion = signal<Cliente | null>(null);
  clienteEnDetalle = signal<Cliente | null>(null);
  clienteADesactivar = signal<Cliente | null>(null);
  procesandoEstado = signal(false);

  ngOnInit(): void {
    this.cargarClientes();
  }

  ngAfterViewInit(): void {
    this.columnas.set([
      { key: 'codigo', header: 'Código', width: '120px', cellTemplate: this.codigoCellTpl },
      { key: 'nombre', header: 'Cliente', cellTemplate: this.clienteCellTpl },
      {
        key: 'documento',
        header: 'Documento',
        width: '190px',
        cellTemplate: this.documentoCellTpl,
      },
      { key: 'categoria', header: 'Tipo', width: '118px', cellTemplate: this.categoriaCellTpl },
      { key: 'telefono', header: 'Teléfono', width: '130px', muted: true },
      { key: 'estado', header: 'Estado', width: '110px', cellTemplate: this.estadoCellTpl },
      {
        key: 'acciones',
        header: 'Acciones',
        width: '230px',
        align: 'right',
        cellTemplate: this.accionesCellTpl,
      },
    ]);
  }

  cargarClientes(pagina = this.pagina()): void {
    this.pagina.set(pagina);
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.clienteService
      .listar(pagina, this.tamanioPagina, {
        search: this.query().trim() || undefined,
        estado: this.estadoFiltro() === '' ? undefined : this.estadoFiltro() === 'true',
        categoria: (this.categoriaFiltro() || undefined) as CategoriaCliente | undefined,
      })
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.clientes.set(resultado.clientes);
          this.pagina.set(resultado.pagina);
          this.total.set(resultado.total);
          this.totalPaginas.set(resultado.totalPaginas);
        },
        error: () => {
          this.clientes.set([]);
          this.total.set(0);
          this.totalPaginas.set(0);
          this.errorCarga.set(true);
        },
      });
  }

  setQuery(valor: string): void {
    this.query.set(valor);
    this.cargarClientes(1);
  }

  setCategoria(valor: string): void {
    this.categoriaFiltro.set(valor);
    this.cargarClientes(1);
  }

  setEstado(valor: string): void {
    this.estadoFiltro.set(valor);
    this.cargarClientes(1);
  }

  cambiarPagina(pagina: number): void {
    if (pagina !== this.pagina() && pagina >= 1 && pagina <= this.totalPaginas()) {
      this.cargarClientes(pagina);
    }
  }

  categoriaTone(categoria: CategoriaCliente): BadgeTone {
    return categoria === 'mayorista' ? 'brand' : 'neutral';
  }

  categoriaLabel(categoria: CategoriaCliente): string {
    return CATEGORIA_LABEL[categoria];
  }

  estadoTone(estado: boolean): BadgeTone {
    return estado ? 'success' : 'neutral';
  }

  documentoLabel(cliente: Cliente): string {
    return TIPO_DOCUMENTO_LABEL[cliente.tipoDocumento];
  }

  // --- Alta / edición / detalle ---
  nuevoCliente(): void {
    this.clienteEnEdicion.set(null);
    this.modalFormAbierto.set(true);
  }

  /** Desde el detalle: lo cierra y abre el formulario de edición del mismo cliente. */
  editarDesdeDetalle(cliente: Cliente): void {
    this.clienteEnDetalle.set(null);
    this.editarCliente(cliente);
  }

  editarCliente(cliente: Cliente): void {
    this.clienteEnEdicion.set(cliente);
    this.modalFormAbierto.set(true);
  }

  cerrarForm(): void {
    this.modalFormAbierto.set(false);
    this.clienteEnEdicion.set(null);
  }

  verCliente(cliente: Cliente): void {
    this.clienteEnDetalle.set(cliente);
  }

  clienteGuardado(aviso: string): void {
    this.mostrarAviso(aviso, 'ok');
    this.cargarClientes();
  }

  // --- Desactivar (lógico, con confirmación) y reactivar ---
  pedirDesactivar(cliente: Cliente): void {
    this.clienteADesactivar.set(cliente);
  }

  cancelarDesactivar(): void {
    this.clienteADesactivar.set(null);
  }

  confirmarDesactivar(): void {
    const cliente = this.clienteADesactivar();
    if (!cliente) {
      return;
    }

    this.procesandoEstado.set(true);
    this.clienteService
      .desactivar(cliente.id)
      .pipe(
        finalize(() => {
          this.procesandoEstado.set(false);
          this.clienteADesactivar.set(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.mostrarAviso(`Cliente ${nombreCliente(cliente)} desactivado.`, 'ok');
          this.cargarClientes();
        },
        error: () => this.mostrarAviso(MENSAJE_ERROR_ESTADO, 'error'),
      });
  }

  reactivarCliente(cliente: Cliente): void {
    this.clienteService
      .activar(cliente.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.mostrarAviso(`Cliente ${nombreCliente(cliente)} reactivado.`, 'ok');
          this.cargarClientes();
        },
        error: () => this.mostrarAviso(MENSAJE_ERROR_ESTADO, 'error'),
      });
  }

  private mostrarAviso(texto: string, tono: 'ok' | 'error'): void {
    this.aviso.set(texto);
    this.avisoTono.set(tono);
  }
}
