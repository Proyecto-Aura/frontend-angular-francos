import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideChevronDown, LucideChevronRight } from '@lucide/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { RutaNodo } from '../../../../../core/interfaces/ruta-nodo.interface';
import { AvisoBanner } from '../../../../ventas/catalogo/components/aviso-banner/aviso-banner';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Switch } from '../../../../../shared/ds/switch/switch';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { ROL_ADMIN, Rol } from '../../interfaces/usuario.interface';
import {
  alternarAcceso,
  diferencia,
  filasDePermisos,
  idsExpandibles,
  soloVigentes,
} from '../../mappers/permisos.mapper';
import { RolesPermisosService } from '../../services/roles-permisos.service';
import { UsuariosService } from '../../services/usuarios.service';

@Component({
  imports: [AvisoBanner, Badge, Button, Card, Icon, Switch],
  selector: 'app-usuarios-roles-permisos',
  templateUrl: './usuarios-roles-permisos.html',
})
export class UsuariosRolesPermisos {
  private permisosService = inject(RolesPermisosService);
  private usuariosService = inject(UsuariosService);
  private destroyRef = inject(DestroyRef);

  roles = input<Rol[]>([]);

  protected readonly LucideChevronRight = LucideChevronRight;
  protected readonly LucideChevronDown = LucideChevronDown;

  protected readonly arbol = signal<RutaNodo[]>([]);
  protected readonly cargandoArbol = signal(true);
  protected readonly errorArbol = signal('');
  /** Cuántos usuarios tiene cada rol (por nombre). */
  protected readonly cantidades = signal<Record<string, number>>({});

  protected readonly rolId = signal<number | null>(null);
  /** Lo guardado en el servidor y lo que se está editando. */
  private readonly guardados = signal<ReadonlySet<number>>(new Set());
  protected readonly actuales = signal<ReadonlySet<number>>(new Set());
  protected readonly expandidos = signal<ReadonlySet<number>>(new Set());

  protected readonly cargandoAccesos = signal(false);
  protected readonly guardando = signal(false);
  protected readonly aviso = signal<{ mensaje: string; tono: 'ok' | 'error' }>({
    mensaje: '',
    tono: 'ok',
  });

  protected readonly rolActual = computed(
    () => this.roles().find((rol) => rol.id === this.rolId()) ?? null,
  );
  protected readonly titulo = computed(() => {
    const rol = this.rolActual();
    return rol ? `Permisos de ${rol.etiqueta}` : 'Permisos';
  });
  /** El admin siempre ve todo: sus permisos no se editan. */
  protected readonly esAdmin = computed(() => this.rolActual()?.nombre === ROL_ADMIN);
  protected readonly filas = computed(() =>
    filasDePermisos(this.arbol(), this.actuales(), this.expandidos()),
  );
  protected readonly hayCambios = computed(
    () =>
      diferencia(this.actuales(), this.guardados()).length > 0 ||
      diferencia(this.guardados(), this.actuales()).length > 0,
  );

  constructor() {
    this.cargarArbol();

    // Al llegar los roles se elige el primero y se cuentan sus usuarios.
    effect(() => {
      const roles = this.roles();
      if (roles.length === 0) return;
      // Solo reacciona a los roles: elegir otro rol no debe volver a contar.
      untracked(() => {
        if (this.rolId() === null) this.seleccionar(roles[0]);
        this.cargarCantidades(roles);
      });
    });
  }

  protected cargarArbol(): void {
    this.cargandoArbol.set(true);
    this.errorArbol.set('');
    this.permisosService
      .arbolDeRutas()
      .pipe(
        finalize(() => this.cargandoArbol.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (arbol) => {
          const vigentes = soloVigentes(arbol);
          this.arbol.set(vigentes);
          this.expandidos.set(new Set(vigentes.map((modulo) => modulo.id)));
        },
        error: (error: unknown) =>
          this.errorArbol.set(apiErrorMessage(error, 'No se pudo cargar los permisos.')),
      });
  }

  private cargarCantidades(roles: Rol[]): void {
    forkJoin(
      roles.map((rol) =>
        this.usuariosService.contarPorRol(rol.nombre).pipe(catchError(() => of(null))),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((totales) => {
        const cantidades: Record<string, number> = {};
        roles.forEach((rol, i) => {
          const total = totales[i];
          if (total !== null) cantidades[rol.nombre] = total;
        });
        this.cantidades.set(cantidades);
      });
  }

  protected seleccionar(rol: Rol): void {
    this.rolId.set(rol.id);
    this.aviso.set({ mensaje: '', tono: 'ok' });
    this.cargarAccesos(rol.id);
  }

  private cargarAccesos(rolId: number): void {
    this.cargandoAccesos.set(true);
    this.permisosService
      .rutasDelRol(rolId)
      .pipe(
        finalize(() => this.cargandoAccesos.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (accesos) => {
          // Si el usuario ya cambió de rol mientras esto cargaba, se ignora.
          if (this.rolId() !== rolId) return;
          this.guardados.set(accesos);
          this.actuales.set(new Set(accesos));
        },
        error: (error: unknown) =>
          this.aviso.set({
            mensaje: apiErrorMessage(error, 'No se pudo cargar los permisos del rol.'),
            tono: 'error',
          }),
      });
  }

  protected alternar(nodo: RutaNodo): void {
    if (this.esAdmin()) return;
    this.actuales.update((accesos) => alternarAcceso(nodo, accesos));
  }

  protected alternarRama(nodo: RutaNodo): void {
    this.expandidos.update((ids) => {
      const siguiente = new Set(ids);
      if (siguiente.has(nodo.id)) siguiente.delete(nodo.id);
      else siguiente.add(nodo.id);
      return siguiente;
    });
  }

  protected expandirTodo(): void {
    this.expandidos.set(new Set(idsExpandibles(this.arbol())));
  }

  protected contraerTodo(): void {
    this.expandidos.set(new Set());
  }

  protected descartar(): void {
    this.actuales.set(new Set(this.guardados()));
  }

  protected guardar(): void {
    const rolId = this.rolId();
    if (rolId === null || this.esAdmin() || !this.hayCambios()) return;

    const otorgar = diferencia(this.actuales(), this.guardados());
    const revocar = diferencia(this.guardados(), this.actuales());

    this.guardando.set(true);
    this.aviso.set({ mensaje: '', tono: 'ok' });
    this.permisosService
      .guardar(rolId, otorgar, revocar)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.aviso.set({ mensaje: 'Permisos guardados correctamente', tono: 'ok' });
          this.cargarAccesos(rolId);
        },
        // No es atómico: se vuelve a leer para mostrar lo que quedó guardado de verdad.
        error: (error: unknown) => {
          this.aviso.set({
            mensaje: apiErrorMessage(
              error,
              'No se pudieron guardar todos los permisos. Revise el resultado e intente nuevamente.',
            ),
            tono: 'error',
          });
          this.cargarAccesos(rolId);
        },
      });
  }

  protected cerrarAviso(): void {
    this.aviso.set({ mensaje: '', tono: 'ok' });
  }
}
