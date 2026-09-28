import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { LoginResponseDto } from '../interfaces/usuario-dto.interface';
import { Usuario } from '../interfaces/usuario.interface';
import { mapUsuarioDtoToUsuario } from '../mappers/usuario.mapper';

const TOKEN_KEY = 'francos_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  usuario = signal<Usuario | null>(null);
  isAuthenticated = computed(() => this.usuario() !== null);

  login(username: string, password: string) {
    return this.http.post<LoginResponseDto>('/api/auth/login', { username, password }).pipe(
      tap(response => {
        localStorage.setItem(TOKEN_KEY, response.token);
        this.usuario.set(mapUsuarioDtoToUsuario(response.usuario));
      }),
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.usuario.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
