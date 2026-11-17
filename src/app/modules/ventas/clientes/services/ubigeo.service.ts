import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UbigeoItem } from '../interfaces/ubicacion.interface';

const UBIGEO_BASE = `${environment.apiUrl}/ubigeo`;

/** Catálogo de ubicación (solo lectura) para los selects en cascada. */
@Injectable({ providedIn: 'root' })
export class UbigeoService {
  private http = inject(HttpClient);

  departamentos(): Observable<UbigeoItem[]> {
    return this.http.get<UbigeoItem[]>(`${UBIGEO_BASE}/departamentos`);
  }

  provincias(departamentoId: string): Observable<UbigeoItem[]> {
    return this.http.get<UbigeoItem[]>(`${UBIGEO_BASE}/provincias`, {
      params: { departamento_id: departamentoId },
    });
  }

  distritos(provinciaId: string): Observable<UbigeoItem[]> {
    return this.http.get<UbigeoItem[]>(`${UBIGEO_BASE}/distritos`, {
      params: { provincia_id: provinciaId },
    });
  }
}
