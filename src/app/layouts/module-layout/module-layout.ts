import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import { Header } from '../../shared/ui/header/header';
import { Sidebar, SidebarLink } from '../../shared/ui/sidebar/sidebar';

@Component({
  imports: [RouterOutlet, Header, Sidebar],
  selector: 'app-module-layout',
  templateUrl: './module-layout.html',
})
export class ModuleLayout {
  private route = inject(ActivatedRoute);

  links = (this.route.snapshot.data['sidebarLinks'] as SidebarLink[]) ?? [];
  sectionLabel = (this.route.snapshot.data['sidebarTitle'] as string) ?? null;

  // TODO: reemplazar por los datos reales del usuario autenticado (AuthService)
  userName = 'Andres Chavarri Centeno';
  userRole = 'Administrador';
}
