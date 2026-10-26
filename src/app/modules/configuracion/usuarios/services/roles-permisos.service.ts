import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { RutaNodo } from '../../../../core/interfaces/ruta-nodo.interface';
import { AccesoDto } from '../interfaces/usuario-dto.interface';

const RUTAS_TREE_URL = `${environment.apiUrl}/rutas/tree`;
const ROLES_URL = `${environment.apiUrl}/roles`;

@Injectable({ providedIn: 'root' })
export class RolesPermisosService {
  private http = inject(HttpClient);

  /** Todas las rutas del sistema (módulos y pantallas), en árbol. */
  arbolDeRutas(): Observable<RutaNodo[]> {
    return this.http.get<RutaNodo[]>(RUTAS_TREE_URL);
  }

  /** Ids de las rutas a las que el rol tiene acceso vigente. */
  rutasDelRol(rolId: number): Observable<Set<number>> {
    return this.http
      .get<AccesoDto[]>(`${ROLES_URL}/${rolId}/rutas`)
      .pipe(map((accesos) => new Set(accesos.filter((a) => a.estado).map((a) => a.ruta_id))));
  }

  /**
   * El backend otorga y revoca una ruta por llamada, así que se aplican las
   * diferencias una a una. No es atómico: si alguna falla, quien llama debe
   * volver a cargar los permisos para ver lo que quedó realmente guardado.
   */
  guardar(rolId: number, otorgar: number[], revocar: number[]): Observable<unknown> {
    const llamadas = [
      ...otorgar.map((rutaId) => this.http.post(`${ROLES_URL}/${rolId}/rutas/${rutaId}`, {})),
      ...revocar.map((rutaId) => this.http.delete(`${ROLES_URL}/${rolId}/rutas/${rutaId}`)),
    ];
    return llamadas.length ? forkJoin(llamadas) : of(null);
  }
}
