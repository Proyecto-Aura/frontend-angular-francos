import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TableroControlTiDto } from '../interfaces/tablero-control-ti-dto.interface';
import { TableroControlTi } from '../interfaces/tablero-control-ti.interface';
import { toTableroControlTi } from '../mappers/tablero-control-ti.mapper';

@Injectable({ providedIn: 'root' })
export class TableroControlTiService {
  private http = inject(HttpClient);

  obtener(planId: number): Observable<TableroControlTi> {
    return this.http
      .get<TableroControlTiDto>(
        `${environment.apiUrl}/planes-estrategicos/${planId}/tablero-control-ti`,
      )
      .pipe(map(toTableroControlTi));
  }
}
