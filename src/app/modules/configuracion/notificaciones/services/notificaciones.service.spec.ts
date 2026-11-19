import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import {
  makeCanalEmailDto,
  makeCanalPortalDto,
  makePlantillaDto,
} from '../testing/notificacion.fixtures';
import { NotificacionesService } from './notificaciones.service';

const CANALES_URL = `${environment.apiUrl}/parametros-notificaciones/canales`;
const PLANTILLAS_URL = `${environment.apiUrl}/parametros-notificaciones/plantillas`;

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificacionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('canales() separa el de email y el de portal de la lista que manda el backend', () => {
    let resultado: { email: { activo: boolean }; portal: { activo: boolean } } | undefined;
    service.canales().subscribe((r) => (resultado = r));

    const req = http.expectOne(CANALES_URL);
    req.flush([makeCanalEmailDto({ activo: false }), makeCanalPortalDto({ activo: true })]);

    expect(resultado?.email.activo).toBe(false);
    expect(resultado?.portal.activo).toBe(true);
  });

  it('actualizarCanalEmail() manda PATCH /canales/email con { activo }', () => {
    service.actualizarCanalEmail(false).subscribe();

    const req = http.expectOne({ method: 'PATCH', url: `${CANALES_URL}/email` });
    expect(req.request.body).toEqual({ activo: false });
    req.flush(makeCanalEmailDto({ activo: false }));
  });

  it('actualizarCanalPortal() manda PATCH /canales/portal con { activo }', () => {
    service.actualizarCanalPortal(true).subscribe();

    const req = http.expectOne({ method: 'PATCH', url: `${CANALES_URL}/portal` });
    expect(req.request.body).toEqual({ activo: true });
    req.flush(makeCanalPortalDto({ activo: true }));
  });

  it('plantillas() convierte cada una del listado', () => {
    let resultado: { nombre: string }[] = [];
    service.plantillas().subscribe((r) => (resultado = r));

    http
      .expectOne(PLANTILLAS_URL)
      .flush([
        makePlantillaDto(),
        makePlantillaDto({ clave: 'bienvenida_cliente', nombre: 'Bienvenida de cliente' }),
      ]);

    expect(resultado).toHaveLength(2);
    expect(resultado[1].nombre).toBe('Bienvenida de cliente');
  });

  it('actualizarPlantilla() manda PATCH /plantillas/:clave con asunto y cuerpo', () => {
    service.actualizarPlantilla('verificacion_email', 'Nuevo asunto', 'Nuevo cuerpo').subscribe();

    const req = http.expectOne({ method: 'PATCH', url: `${PLANTILLAS_URL}/verificacion_email` });
    expect(req.request.body).toEqual({ asunto: 'Nuevo asunto', cuerpo: 'Nuevo cuerpo' });
    req.flush(makePlantillaDto({ asunto: 'Nuevo asunto', cuerpo: 'Nuevo cuerpo' }));
  });
});
