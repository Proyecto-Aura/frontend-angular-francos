import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TableroControlDto } from '../interfaces/tablero-control-dto.interface';
import { TableroControl } from '../interfaces/tablero-control.interface';
import { toTableroControl } from '../mappers/tablero-control.mapper';

@Injectable({ providedIn: 'root' })
export class TableroControlService {
  private http = inject(HttpClient);

  obtener(planId: number): Observable<TableroControl> {
    return this.http
      .get<TableroControlDto>(`${environment.apiUrl}/planes-estrategicos/${planId}/tablero-control`)
      .pipe(map(toTableroControl));
  }
}
