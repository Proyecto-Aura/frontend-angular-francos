import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  DocumentoEstrategicoDto,
  DocumentosEstrategicosPageDto,
} from '../interfaces/documento-estrategico-dto.interface';
import {
  DocumentoEstrategico,
  DocumentosEstrategicosPagina,
} from '../interfaces/documento-estrategico.interface';
import {
  toDocumentoEstrategico,
  toDocumentosPagina,
} from '../mappers/documento-estrategico.mapper';

@Injectable({ providedIn: 'root' })
export class DocumentoEstrategicoService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/documentos-estrategicos`;

  listar(planId: number, pagina = 1, limite = 10): Observable<DocumentosEstrategicosPagina> {
    const params = new HttpParams()
      .set('plan_estrategico_id', planId)
      .set('page', pagina)
      .set('limit', limite);

    return this.http
      .get<DocumentosEstrategicosPageDto>(this.baseUrl, { params })
      .pipe(map(toDocumentosPagina));
  }

  obtener(id: number): Observable<DocumentoEstrategico> {
    return this.http
      .get<DocumentoEstrategicoDto>(`${this.baseUrl}/${id}`)
      .pipe(map(toDocumentoEstrategico));
  }

  subir(planId: number, nombre: string, archivo: File): Observable<DocumentoEstrategico> {
    const formData = new FormData();
    formData.append('plan_estrategico_id', String(planId));
    formData.append('nombre', nombre.trim());
    formData.append('archivo', archivo);

    return this.http
      .post<DocumentoEstrategicoDto>(this.baseUrl, formData)
      .pipe(map(toDocumentoEstrategico));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
