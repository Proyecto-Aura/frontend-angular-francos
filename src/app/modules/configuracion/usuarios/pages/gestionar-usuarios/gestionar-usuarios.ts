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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  LucideBan,
  LucideEllipsis,
  LucidePencil,
  LucidePlus,
  LucideRotateCcw,
  LucideSearch,
} from '@lucide/angular';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap, tap } from 'rxjs';

import { AuthService } from '../../../../auth/services/auth.service';
import { AvisoBanner } from '../../../../ventas/catalogo/components/aviso-banner/aviso-banner';
import { Avatar } from '../../../../../shared/ds/avatar/avatar';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/ds/breadcrumb/breadcrumb';
import { Button } from '../../../../../shared/ds/button/button';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import {
  DropdownMenu,
  DropdownMenuItem,
} from '../../../../../shared/ds/dropdown-menu/dropdown-menu';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { UsuarioDesactivarModal } from '../../components/usuario-desactivar-modal/usuario-desactivar-modal';
import {
  UsuarioFormModal,
  UsuarioGuardado,
} from '../../components/usuario-form-modal/usuario-form-modal';
import { UsuariosRolesPermisos } from '../../components/usuarios-roles-permisos/usuarios-roles-permisos';
import {
  FiltrosUsuarios,
  ROL_ADMIN,
  Rol,
  USUARIOS_POR_PAGINA,
  Usuario,
  etiquetaDeRol,
} from '../../interfaces/usuario.interface';
import { UsuariosService } from '../../services/usuarios.service';

interface RowCtx {
  $implicit: Usuario;
  index: number;
}

type Pestana = 'usuarios' | 'roles';

const FILTROS_INICIALES: FiltrosUsuarios = { busqueda: '', rol: '', estado: '', pagina: 1 };

@Component({
  imports: [
    AvisoBanner,
    Avatar,
    Badge,
    Breadcrumb,
    Button,
    CellStack,
    DataTable,
    DropdownMenu,
    FilterBar,
    Icon,
    IconButton,
    Input,
    Pagination,
    Select,
    Tabs,
    UsuarioDesactivarModal,
    UsuarioFormModal,
    UsuariosRolesPermisos,
  ],
  selector: 'app-gestionar-usuarios',
  templateUrl: './gestionar-usuarios.html',
})
export class GestionarUsuarios implements OnInit, AfterViewInit {
  private usuariosService = inject(UsuariosService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('usuarioCell', { static: true }) usuarioCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('rolCell', { static: true }) rolCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<RowCtx>;

  protected readonly LucideSearch = LucideSearch;
  protected readonly LucidePlus = LucidePlus;
  protected readonly LucidePencil = LucidePencil;
  protected readonly LucideBan = LucideBan;
  protected readonly LucideEllipsis = LucideEllipsis;
  protected readonly LucideRotateCcw = LucideRotateCcw;
  protected readonly porPagina = USUARIOS_POR_PAGINA;

  protected readonly migas: BreadcrumbItem[] = [
    { label: 'Configuración' },
    { label: 'Usuarios internos' },
  ];

  protected readonly pestana = signal<Pestana>('usuarios');
  protected readonly pestanas = computed<DsTab[]>(() => [
    { id: 'usuarios', label: 'Usuarios', count: this.totalGeneral() ?? undefined },
    { id: 'roles', label: 'Roles y permisos' },
  ]);

  // --- Datos ---
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly total = signal(0);
  protected readonly totalPaginas = signal(1);
  /** Total sin filtros, para el contador de la pestaña. Null hasta conocerlo. */
  protected readonly totalGeneral = signal<number | null>(null);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly aviso = signal<{ mensaje: string; tono: 'ok' | 'error' }>({
    mensaje: '',
    tono: 'ok',
  });

  // --- Filtros ---
  protected readonly busqueda = signal('');
  protected readonly filtros = signal<FiltrosUsuarios>({ ...FILTROS_INICIALES });
  private readonly recarga = signal(0);
  private readonly usernameActual = signal('');

  protected readonly hayFiltros = computed(() => {
    const filtros = this.filtros();
    return !!(this.busqueda() || filtros.rol || filtros.estado);
  });

  protected readonly opcionesRol = computed<SelectOption[]>(() =>
    this.roles().map((rol) => ({ value: rol.nombre, label: rol.etiqueta })),
  );
  protected readonly opcionesEstado: SelectOption[] = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
  ];

  protected readonly columns = signal<DsColumn[]>([
    { key: 'usuario', header: 'Usuario' },
    { key: 'email', header: 'Email', muted: true },
    { key: 'rol', header: 'Rol', width: '150px' },
    { key: 'estado', header: 'Estado', width: '120px' },
    { key: 'creado', header: 'Creado', width: '130px', muted: true },
    { key: 'acciones', header: 'Acciones', width: '90px', align: 'right' },
  ]);

  // --- Modales ---
  protected readonly formAbierto = signal(false);
  protected readonly usuarioEnEdicion = signal<Usuario | null>(null);
  protected readonly usuarioADesactivar = signal<Usuario | null>(null);

  constructor() {
    // La búsqueda espera a que se deje de escribir antes de consultar.
    toObservable(this.busqueda)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((texto) => this.actualizarFiltros({ busqueda: texto }));

    toObservable(computed(() => ({ filtros: this.filtros(), recarga: this.recarga() })))
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.errorCarga.set('');
        }),
        // switchMap descarta la respuesta de una consulta vieja si ya hay otra.
        switchMap(({ filtros }) =>
          this.usuariosService.listar(filtros).pipe(
            catchError((error: unknown) => {
              this.errorCarga.set(apiErrorMessage(error, 'No se pudo cargar los usuarios.'));
              return of(null);
            }),
            finalize(() => this.cargando.set(false)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pagina) => {
        if (!pagina) return;
        this.usuarios.set(pagina.usuarios);
        this.total.set(pagina.total);
        this.totalPaginas.set(pagina.totalPaginas);
        const filtros = this.filtros();
        if (!filtros.busqueda && !filtros.rol && !filtros.estado) {
          this.totalGeneral.set(pagina.total);
        }
      });
  }

  ngOnInit(): void {
    this.usuariosService
      .roles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (roles) => this.roles.set(roles), error: () => undefined });

    this.authService
      .getCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (me) => this.usernameActual.set(me.username), error: () => undefined });
  }

  ngAfterViewInit(): void {
    this.columns.update((columnas) =>
      columnas.map((columna) => {
        if (columna.key === 'usuario') return { ...columna, cellTemplate: this.usuarioCellTpl };
        if (columna.key === 'rol') return { ...columna, cellTemplate: this.rolCellTpl };
        if (columna.key === 'estado') return { ...columna, cellTemplate: this.estadoCellTpl };
        if (columna.key === 'acciones') return { ...columna, cellTemplate: this.accionesCellTpl };
        return columna;
      }),
    );
  }

  // --- Filtros: cada cambio vuelve a la página 1 ---
  private actualizarFiltros(cambios: Partial<FiltrosUsuarios>): void {
    this.filtros.update((actuales) => ({ ...actuales, pagina: 1, ...cambios }));
  }

  protected cambiarRol(rol: string): void {
    this.actualizarFiltros({ rol });
  }

  protected cambiarEstado(estado: string): void {
    this.actualizarFiltros({ estado });
  }

  protected limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtros.set({ ...FILTROS_INICIALES });
  }

  protected irAPagina(pagina: number): void {
    this.filtros.update((actuales) => ({ ...actuales, pagina }));
  }

  protected recargar(): void {
    this.recarga.update((n) => n + 1);
  }

  // --- Filas ---
  protected esUsuarioActual(usuario: Usuario): boolean {
    return !!this.usernameActual() && usuario.username === this.usernameActual();
  }

  protected rolDe(usuario: Usuario): string {
    return usuario.roles.map((rol) => etiquetaDeRol(rol.nombre)).join(', ');
  }

  protected tonoDeRol(usuario: Usuario): BadgeTone {
    return usuario.roles.some((rol) => rol.nombre === ROL_ADMIN) ? 'brand' : 'neutral';
  }

  /**
   * Se calculan una vez por lista: un método que devolviera un arreglo nuevo en
   * cada ciclo de detección haría que el menú se vuelva a asignar sin parar.
   */
  protected readonly accionesPorUsuario = computed(
    () => new Map(this.usuarios().map((usuario) => [usuario.id, this.accionesDe(usuario)])),
  );

  private accionesDe(usuario: Usuario): DropdownMenuItem[] {
    const acciones: DropdownMenuItem[] = [
      { label: 'Editar', icon: LucidePencil, onSelect: () => this.editar(usuario) },
    ];
    if (!usuario.activo) {
      acciones.push({
        label: 'Reactivar',
        icon: LucideRotateCcw,
        onSelect: () => this.reactivar(usuario),
      });
    } else if (!this.esUsuarioActual(usuario)) {
      acciones.push(
        { separator: true },
        {
          label: 'Desactivar',
          icon: LucideBan,
          destructive: true,
          onSelect: () => this.usuarioADesactivar.set(usuario),
        },
      );
    }
    return acciones;
  }

  // --- Acciones ---
  protected nuevo(): void {
    this.usuarioEnEdicion.set(null);
    this.formAbierto.set(true);
  }

  protected editar(usuario: Usuario): void {
    this.usuarioEnEdicion.set(usuario);
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    this.formAbierto.set(false);
  }

  protected alGuardar({ usuario, modo }: UsuarioGuardado): void {
    this.mostrarAviso(
      modo === 'nuevo'
        ? `Usuario ${usuario.nombreCompleto} creado correctamente`
        : `Usuario ${usuario.nombreCompleto} actualizado`,
    );
    this.recargar();
  }

  protected alDesactivar(usuario: Usuario): void {
    this.mostrarAviso(`Usuario ${usuario.nombreCompleto} desactivado`);
    this.recargar();
  }

  private reactivar(usuario: Usuario): void {
    this.usuariosService
      .reactivar(usuario.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reactivado) => {
          this.mostrarAviso(`Usuario ${reactivado.nombreCompleto} reactivado`);
          this.recargar();
        },
        error: (error: unknown) =>
          this.mostrarAviso(
            apiErrorMessage(error, 'No se pudo reactivar el usuario. Intente nuevamente.'),
            'error',
          ),
      });
  }

  protected mostrarAviso(mensaje: string, tono: 'ok' | 'error' = 'ok'): void {
    this.aviso.set({ mensaje, tono });
  }

  protected cerrarAviso(): void {
    this.aviso.set({ mensaje: '', tono: 'ok' });
  }

  protected cambiarPestana(id: string): void {
    this.pestana.set(id === 'roles' ? 'roles' : 'usuarios');
  }
}
