import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { makeNodo } from '../../testing/usuario-fixtures';
import { PerfilUsuario } from './perfil-usuario';

const ME = `${environment.apiUrl}/auth/me`;
const MENU = `${environment.apiUrl}/rutas/mi-menu`;

const PERFIL = {
  nombre_completo: 'Lucia Quispe Huaman',
  nombres: 'Lucia',
  apellido_paterno: 'Quispe',
  apellido_materno: 'Huaman',
  email: 'lucia@francos.test',
  username: 'lquispe',
  roles: ['ventas', 'produccion'],
};

describe('PerfilUsuario', () => {
  let fixture: ComponentFixture<PerfilUsuario>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PerfilUsuario],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PerfilUsuario);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('muestra los datos del usuario, sus roles y sus permisos de acceso', () => {
    http.expectOne(ME).flush(PERFIL);
    http.expectOne(MENU).flush([
      makeNodo({
        id: 1,
        etiqueta: 'Ventas',
        children: [
          makeNodo({ id: 2, etiqueta: 'Catálogo' }),
          makeNodo({ id: 3, etiqueta: 'Clientes' }),
        ],
      }),
    ]);
    fixture.detectChanges();

    const texto = el.textContent ?? '';
    expect(texto).toContain('Mi perfil');
    expect(texto).toContain('Lucia Quispe Huaman');
    expect(texto).toContain('lucia@francos.test');
    expect(texto).toContain('@lquispe');
    expect(texto).toContain('Ventas');
    expect(texto).toContain('Producción');
    expect(texto).toContain('Catálogo');
    expect(texto).toContain('Clientes');
    expect(texto).toContain('Los cambios de datos y roles los realiza un administrador');
  });

  it('avisa si no tiene módulos asignados', () => {
    http.expectOne(ME).flush(PERFIL);
    http.expectOne(MENU).flush([]);
    fixture.detectChanges();

    expect(el.textContent).toContain('No tiene módulos asignados');
  });

  it('muestra el error y permite reintentar si no carga', () => {
    http
      .expectOne(ME)
      .flush({ message: 'No autorizado' }, { status: 401, statusText: 'Unauthorized' });
    // El menú se pide en paralelo y queda en caché: se responde para que el reintento lo reutilice.
    http.expectOne(MENU).flush([]);
    fixture.detectChanges();
    expect(el.textContent).toContain('No autorizado');

    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    http.expectOne(ME).flush(PERFIL);
    fixture.detectChanges();

    expect(el.textContent).toContain('Lucia Quispe Huaman');
  });
});
