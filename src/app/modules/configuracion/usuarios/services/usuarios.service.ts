import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, last, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ListaRolesDto,
  PaginaUsuariosDto,
  UsuarioInternoDto,
} from '../interfaces/usuario-dto.interface';
import {
  FiltrosUsuarios,
  PaginaUsuarios,
  ROL_CLIENTE,
  Rol,
  USUARIOS_POR_PAGINA,
  Usuario,
  UsuarioForm,
} from '../interfaces/usuario.interface';
import {
  toActualizarUsuarioRequest,
  toCrearUsuarioRequest,
  toPaginaUsuarios,
  toRol,
  toUsuario,
} from '../mappers/usuario.mapper';

const USUARIOS_URL = `${environment.apiUrl}/usuarios`;
const ROLES_URL = `${environment.apiUrl}/roles`;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  listar(filtros: FiltrosUsuarios): Observable<PaginaUsuarios> {
    let params = new HttpParams().set('page', filtros.pagina).set('limit', USUARIOS_POR_PAGINA);
    const busqueda = filtros.busqueda.trim();
    if (busqueda) params = params.set('search', busqueda);
    if (filtros.rol) params = params.set('rol', filtros.rol);
    if (filtros.estado) params = params.set('estado', filtros.estado === 'activo');

    return this.http.get<PaginaUsuariosDto>(USUARIOS_URL, { params }).pipe(map(toPaginaUsuarios));
  }

  /** Cuántos usuarios tiene un rol (para la lista de "Roles y permisos"). */
  contarPorRol(rol: string): Observable<number> {
    const params = new HttpParams().set('limit', 1).set('rol', rol);
    return this.http
      .get<PaginaUsuariosDto>(USUARIOS_URL, { params })
      .pipe(map((pagina) => pagina.meta.total));
  }

  /** Roles asignables a un usuario interno (sin el rol cliente). */
  roles(): Observable<Rol[]> {
    return this.http
      .get<ListaRolesDto>(ROLES_URL)
      .pipe(
        map((respuesta) =>
          respuesta.data.filter((rol) => rol.nombre !== ROL_CLIENTE && rol.estado).map(toRol),
        ),
      );
  }

  crear(form: UsuarioForm): Observable<Usuario> {
    return this.http
      .post<UsuarioInternoDto>(USUARIOS_URL, toCrearUsuarioRequest(form))
      .pipe(map(toUsuario));
  }

  /**
   * Edita los datos (PATCH) y, si cambió el rol, lo reasigna (PUT roles).
   * El email y el documento no se editan: el backend no los acepta.
   */
  editar(original: Usuario, form: UsuarioForm, rolCambio: boolean): Observable<Usuario> {
    const cambios = toActualizarUsuarioRequest(original, form);
    const hayDatos = Object.keys(cambios).length > 0;

    const pasos: Observable<UsuarioInternoDto>[] = [];
    if (hayDatos) {
      pasos.push(this.http.patch<UsuarioInternoDto>(`${USUARIOS_URL}/${original.id}`, cambios));
    }
    if (rolCambio) {
      pasos.push(
        this.http.put<UsuarioInternoDto>(`${USUARIOS_URL}/${original.id}/roles`, {
          rol_ids: [Number(form.rolId)],
        }),
      );
    }
    if (pasos.length === 0) return of(original);

    return concat(...pasos).pipe(last(), map(toUsuario));
  }

  desactivar(id: string): Observable<Usuario> {
    return this.http.delete<UsuarioInternoDto>(`${USUARIOS_URL}/${id}`).pipe(map(toUsuario));
  }

  reactivar(id: string): Observable<Usuario> {
    return this.http
      .patch<UsuarioInternoDto>(`${USUARIOS_URL}/${id}/activate`, {})
      .pipe(map(toUsuario));
  }
}
