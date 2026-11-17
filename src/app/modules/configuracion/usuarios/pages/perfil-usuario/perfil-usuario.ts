import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { MeResponseDto } from '../../../../auth/interfaces/usuario-dto.interface';
import { AuthService } from '../../../../auth/services/auth.service';
import { RutaNodo } from '../../../../../core/interfaces/ruta-nodo.interface';
import { MenuService } from '../../../../../core/services/menu.service';
import { Avatar } from '../../../../../shared/ds/avatar/avatar';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/ds/breadcrumb/breadcrumb';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { etiquetaDeRol } from '../../interfaces/usuario.interface';

@Component({
  imports: [Avatar, Badge, Breadcrumb, Button, Card],
  selector: 'app-perfil-usuario',
  templateUrl: './perfil-usuario.html',
})
export class PerfilUsuario implements OnInit {
  private authService = inject(AuthService);
  private menuService = inject(MenuService);
  private destroyRef = inject(DestroyRef);

  protected readonly migas: BreadcrumbItem[] = [{ label: 'Configuración' }, { label: 'Mi perfil' }];

  protected readonly cargando = signal(true);
  protected readonly error = signal('');
  protected readonly perfil = signal<MeResponseDto | null>(null);
  protected readonly modulos = signal<RutaNodo[]>([]);

  protected readonly etiquetaDeRol = etiquetaDeRol;

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({ perfil: this.authService.getCurrentUser(), menu: this.menuService.getTree() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ perfil, menu }) => {
          this.perfil.set(perfil);
          this.modulos.set(menu);
          this.cargando.set(false);
        },
        error: (error: unknown) => {
          this.error.set(apiErrorMessage(error, 'No se pudo cargar su perfil.'));
          this.cargando.set(false);
        },
      });
  }
}
