import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MenuService } from './menu.service';
import { AuthService, AuthSession } from '../../modules/auth/services/auth.service';
import { environment } from '../../../environments/environment';
import { RutaNodo } from '../interfaces/ruta-nodo.interface';

const TREE_URL = `${environment.apiUrl}/rutas/mi-menu`;

function makeTree(): RutaNodo[] {
  return [
    {
      id: 1,
      nombre: 'inventario',
      etiqueta: 'Inventario',
      icono: 'package',
      descripcion: 'Control de stock y productos',
      estado: true,
      parent_id: null,
      children: [],
    },
  ];
}

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 't',
    roles: ['admin'],
    emailVerificado: true,
    debeCambiarContrasena: false,
    ...overrides,
  };
}

describe('MenuService', () => {
  let service: MenuService;
  let authService: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MenuService);
    authService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.flushEffects(); // consume el run inicial del effect (arranca con sesion null)
  });

  afterEach(() => httpMock.verify());

  it('fetches the tree from GET /rutas/mi-menu (already role-filtered server-side)', () => {
    service.getTree().subscribe((tree) => expect(tree).toEqual(makeTree()));
    httpMock.expectOne(TREE_URL).flush(makeTree());
  });

  it('caches the result — a second call does not trigger a second HTTP request', () => {
    service.getTree().subscribe();
    httpMock.expectOne(TREE_URL).flush(makeTree());

    let secondResult: RutaNodo[] | undefined;
    service.getTree().subscribe((tree) => (secondResult = tree));

    httpMock.expectNone(TREE_URL);
    expect(secondResult).toEqual(makeTree());
  });

  it('invalidates the cache when the session changes (login/logout/switch user) — bug fix', () => {
    service.getTree().subscribe();
    httpMock.expectOne(TREE_URL).flush(makeTree());

    // Un usuario distinto inicia sesion en la misma pestaña, sin recargar la pagina.
    authService.session.set(makeSession({ roles: ['inventario'] }));
    TestBed.flushEffects();

    service.getTree().subscribe();
    httpMock.expectOne(TREE_URL).flush([]); // ahora si vuelve a pedirlo, no usa el cache viejo
  });
});
