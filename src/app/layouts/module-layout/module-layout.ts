import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from '../../shared/ui/header/header';
import { Sidebar, SidebarLink } from '../../shared/ui/sidebar/sidebar';
import { MenuService } from '../../core/services/menu.service';
import { mapRutaNodosToSidebarLinks } from '../../core/mappers/ruta-nodo.mapper';
import { AuthService } from '../../modules/auth/services/auth.service';
import { capitalize } from '../../core/utils/capitalize';

@Component({
  imports: [RouterOutlet, Header, Sidebar],
  selector: 'app-module-layout',
  templateUrl: './module-layout.html',
})
export class ModuleLayout {
  private route = inject(ActivatedRoute);
  private menuService = inject(MenuService);
  private authService = inject(AuthService);

  private readonly fallbackLinks =
    (this.route.snapshot.data['sidebarLinks'] as SidebarLink[]) ?? [];
  private readonly fallbackTitle = (this.route.snapshot.data['sidebarTitle'] as string) ?? null;
  private readonly moduleNombre = this.route.snapshot.data['moduleNombre'] as string | undefined;

  links = signal<SidebarLink[]>(this.fallbackLinks);
  sectionLabel = signal<string | null>(this.fallbackTitle);

  // Mismo nombre que se ve mientras responde /auth/me, para no dejar el
  // header vacio un instante.
  userName = signal('Usuario');
  userRole = signal('');

  constructor() {
    // Independiente del menu dinamico: el header debe mostrar al usuario
    // real sin importar si este modulo en particular tiene moduleNombre.
    this.authService
      .getCurrentUser()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (me) => {
          this.userName.set(me.nombre_completo);
          this.userRole.set(me.roles[0] ? capitalize(me.roles[0]) : '');
        },
        error: () => undefined,
      });

    if (!this.moduleNombre) return;

    this.menuService
      .getTree()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (tree) => {
          const moduleNode = tree.find((nodo) => nodo.nombre === this.moduleNombre);
          if (!moduleNode) return;
          this.links.set(mapRutaNodosToSidebarLinks(moduleNode.children));
          this.sectionLabel.set(moduleNode.etiqueta);
        },
        error: () => undefined,
      });
  }
}
