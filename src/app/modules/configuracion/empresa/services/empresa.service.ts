import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EmpresaDto } from '../interfaces/empresa-dto.interface';
import { Empresa, EmpresaForm } from '../interfaces/empresa.interface';
import { toEmpresa, toGuardarEmpresaRequest } from '../mappers/empresa.mapper';

const EMPRESA_URL = `${environment.apiUrl}/empresa`;
const LOGO_URL = `${EMPRESA_URL}/logo`;

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private http = inject(HttpClient);

  /** La empresa emisora, o null si todavía no se registró (el backend responde 404). */
  obtener(): Observable<Empresa | null> {
    return this.http.get<EmpresaDto>(EMPRESA_URL).pipe(
      map(toEmpresa),
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && err.status === 404 ? of(null) : throwError(() => err),
      ),
    );
  }

  /** Crea o reemplaza los datos de la emisora. No toca el logo. */
  guardar(form: EmpresaForm): Observable<Empresa> {
    return this.http
      .put<EmpresaDto>(EMPRESA_URL, toGuardarEmpresaRequest(form))
      .pipe(map(toEmpresa));
  }

  subirLogo(archivo: File): Observable<Empresa> {
    const cuerpo = new FormData();
    cuerpo.append('logo', archivo);
    return this.http.post<EmpresaDto>(LOGO_URL, cuerpo).pipe(map(toEmpresa));
  }

  quitarLogo(): Observable<Empresa> {
    return this.http.delete<EmpresaDto>(LOGO_URL).pipe(map(toEmpresa));
  }
}
