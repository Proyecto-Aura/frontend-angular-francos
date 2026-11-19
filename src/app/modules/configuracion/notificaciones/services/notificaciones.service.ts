import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarCanalRequestDto,
  ActualizarPlantillaRequestDto,
  CanalNotificacionDto,
  PlantillaCorreoDto,
} from '../interfaces/notificacion-dto.interface';
import { CanalEmail, CanalPortal, PlantillaCorreo } from '../interfaces/notificacion.interface';
import { toCanalEmail, toCanalPortal, toPlantillaCorreo } from '../mappers/notificacion.mapper';

const BASE_URL = `${environment.apiUrl}/parametros-notificaciones`;
const CANALES_URL = `${BASE_URL}/canales`;
const PLANTILLAS_URL = `${BASE_URL}/plantillas`;

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);

  canales(): Observable<{ email: CanalEmail; portal: CanalPortal }> {
    return this.http.get<CanalNotificacionDto[]>(CANALES_URL).pipe(
      map((canales) => {
        const email = canales.find((c) => c.tipo === 'email');
        const portal = canales.find((c) => c.tipo === 'portal');
        return {
          email: email
            ? toCanalEmail(email)
            : { activo: false, remitente: '', servidorSmtp: '', seguridad: '' },
          portal: portal ? toCanalPortal(portal) : { activo: false, destinatarios: '' },
        };
      }),
    );
  }

  actualizarCanalEmail(activo: boolean): Observable<CanalEmail> {
    const body: ActualizarCanalRequestDto = { activo };
    return this.http
      .patch<CanalNotificacionDto>(`${CANALES_URL}/email`, body)
      .pipe(map(toCanalEmail));
  }

  actualizarCanalPortal(activo: boolean): Observable<CanalPortal> {
    const body: ActualizarCanalRequestDto = { activo };
    return this.http
      .patch<CanalNotificacionDto>(`${CANALES_URL}/portal`, body)
      .pipe(map(toCanalPortal));
  }

  plantillas(): Observable<PlantillaCorreo[]> {
    return this.http
      .get<PlantillaCorreoDto[]>(PLANTILLAS_URL)
      .pipe(map((plantillas) => plantillas.map(toPlantillaCorreo)));
  }

  actualizarPlantilla(clave: string, asunto: string, cuerpo: string): Observable<PlantillaCorreo> {
    const body: ActualizarPlantillaRequestDto = { asunto, cuerpo };
    return this.http
      .patch<PlantillaCorreoDto>(`${PLANTILLAS_URL}/${clave}`, body)
      .pipe(map(toPlantillaCorreo));
  }
}
