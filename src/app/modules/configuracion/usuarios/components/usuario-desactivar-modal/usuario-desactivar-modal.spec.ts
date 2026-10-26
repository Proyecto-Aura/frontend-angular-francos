import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { Usuario } from '../../interfaces/usuario.interface';
import { toUsuario } from '../../mappers/usuario.mapper';
import { makeUsuarioDto } from '../../testing/usuario-fixtures';
import { UsuarioDesactivarModal } from './usuario-desactivar-modal';

const URL = `${environment.apiUrl}/usuarios/u-1`;

describe('UsuarioDesactivarModal', () => {
  let fixture: ComponentFixture<UsuarioDesactivarModal>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let desactivados: Usuario[];
  let cierres: number;

  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsuarioDesactivarModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UsuarioDesactivarModal);
    el = fixture.nativeElement as HTMLElement;
    desactivados = [];
    cierres = 0;
    fixture.componentInstance.deactivated.subscribe((u) => desactivados.push(u));
    fixture.componentInstance.closed.subscribe(() => cierres++);
    fixture.componentRef.setInput('usuario', toUsuario(makeUsuarioDto()));
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('explica que el usuario no podrá ingresar y que sus datos se conservan', () => {
    expect(el.textContent).toContain('Desactivar usuario');
    expect(el.textContent).toContain('Lucia Quispe Huaman no podrá ingresar al sistema');
    expect(el.textContent).toContain('puede reactivarse en cualquier momento');
  });

  it('al confirmar desactiva al usuario, avisa y cierra', () => {
    boton('Desactivar').click();
    http.expectOne({ method: 'DELETE', url: URL }).flush(makeUsuarioDto({ estado: false }));

    expect(desactivados).toHaveLength(1);
    expect(desactivados[0].activo).toBe(false);
    expect(cierres).toBe(1);
  });

  it('muestra el motivo si el backend no deja desactivarlo y se queda abierto', () => {
    boton('Desactivar').click();
    http
      .expectOne({ method: 'DELETE', url: URL })
      .flush(
        { message: 'No puede desactivar al último administrador' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'No puede desactivar al último administrador',
    );
    expect(desactivados).toHaveLength(0);
    expect(cierres).toBe(0);
  });

  it('Cancelar cierra sin llamar al backend', () => {
    boton('Cancelar').click();

    expect(cierres).toBe(1);
    http.expectNone(URL);
  });
});
