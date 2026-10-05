import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginRequestDto, LoginResponseDto } from '../interfaces/usuario-dto.interface';

export interface AuthSession {
  accessToken: string;
  roles: string[];
  emailVerificado: boolean;
  debeCambiarContrasena: boolean;
}

const AUTH_BASE = `${environment.apiUrl}/auth`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // El access_token vive solo en memoria (nunca localStorage) por pedido del
  // backend: el refresh_token real (el que sobrevive un refresh de pagina) es
  // la cookie httpOnly que ellos manejan, no algo que el front deba guardar.
  session = signal<AuthSession | null>(null);
  isAuthenticated = computed(() => this.session() !== null);
  accessToken = computed(() => this.session()?.accessToken ?? null);

  login(identificador: string, password: string) {
    const body: LoginRequestDto = { identificador, password };
    return this.http.post<LoginResponseDto>(`${AUTH_BASE}/login`, body, { withCredentials: true }).pipe(
      tap(response => this.session.set(this.toSession(response))),
    );
  }

  // Pensado para llamarse al arrancar la app (via el interceptor o un APP_INITIALIZER
  // mas adelante): usa la cookie httpOnly para restaurar la sesion sin pedir login de
  // nuevo. Si no hay cookie valida, el backend responde 401 y no se toca el estado.
  // Nota: el backend solo devuelve access_token nuevo aca, no roles/flags — si ya
  // habia una sesion en memoria se conservan sus roles/flags viejos.
  refresh() {
    return this.http.post<{ access_token: string }>(`${AUTH_BASE}/refresh`, null, { withCredentials: true }).pipe(
      tap(response => {
        const current = this.session();
        this.session.set({
          accessToken: response.access_token,
          roles: current?.roles ?? [],
          emailVerificado: current?.emailVerificado ?? false,
          debeCambiarContrasena: current?.debeCambiarContrasena ?? false,
        });
      }),
    );
  }

  logout() {
    // Limpiamos la sesion del front pase lo que pase con la llamada al backend
    // (si el logout ahi falla, igual no tiene sentido dejar al usuario con una
    // sesion "activa" en el front que ya no puede usar).
    return this.http.post(`${AUTH_BASE}/logout`, null, { withCredentials: true }).pipe(
      finalize(() => this.session.set(null)),
    );
  }

  private toSession(response: LoginResponseDto): AuthSession {
    return {
      accessToken: response.access_token,
      roles: response.roles,
      emailVerificado: response.email_verificado,
      debeCambiarContrasena: response.debe_cambiar_contrasena,
    };
  }
}
