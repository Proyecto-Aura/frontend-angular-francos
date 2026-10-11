import { Injectable, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RutaNodo } from '../interfaces/ruta-nodo.interface';
import { AuthService } from '../../modules/auth/services/auth.service';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private tree$: Observable<RutaNodo[]> | null = null;

  constructor() {
    // El arbol es por-sesion, no global: si cambia quien esta logueado
    // (login, logout, o pasar de un usuario a otro sin recargar la pagina),
    // el cache queda invalido y el siguiente getTree() vuelve a pedirlo.
    effect(() => {
      this.authService.session();
      this.tree$ = null;
    });
  }

  // /rutas/mi-menu (no /rutas/tree) a propósito: ya viene filtrado server-side
  // segun el rol del usuario logueado — /tree trae TODO sin filtrar y queda
  // reservado para una futura pantalla de administracion, no para el sidebar.
  getTree(): Observable<RutaNodo[]> {
    this.tree$ ??= this.http
      .get<RutaNodo[]>(`${environment.apiUrl}/rutas/mi-menu`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.tree$;
  }
}
