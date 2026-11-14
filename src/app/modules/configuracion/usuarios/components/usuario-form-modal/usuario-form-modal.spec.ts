import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { Rol, Usuario } from '../../interfaces/usuario.interface';
import { toRol, toUsuario } from '../../mappers/usuario.mapper';
import { makeRolDto, makeUsuarioDto } from '../../testing/usuario-fixtures';
import { UsuarioFormModal, UsuarioGuardado } from './usuario-form-modal';

const URL = `${environment.apiUrl}/usuarios`;
const ROLES: Rol[] = [
  toRol(makeRolDto({ id: 1, nombre: 'admin' })),
  toRol(makeRolDto({ id: 2, nombre: 'ventas' })),
  toRol(makeRolDto({ id: 4, nombre: 'inventario' })),
];

describe('UsuarioFormModal', () => {
  let fixture: ComponentFixture<UsuarioFormModal>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let guardados: UsuarioGuardado[];
  let cierres: number;

  const abrir = (usuario: Usuario | null = null) => {
    fixture.componentRef.setInput('roles', ROLES);
    fixture.componentRef.setInput('usuario', usuario);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  };
  const escribir = (id: string, valor: string) => {
    const input = el.querySelector<HTMLInputElement>(`input#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;
  const interruptorRol = (etiqueta: string) =>
    Array.from(el.querySelectorAll<HTMLLabelElement>('app-ds-switch label'))
      .find((l) => l.textContent?.includes(etiqueta))!
      .querySelector<HTMLInputElement>('input')!;
  const alternarRol = (etiqueta: string) => {
    interruptorRol(etiqueta).click();
    fixture.detectChanges();
  };
  const llenarNuevo = () => {
    escribir('u-nombres', 'Lucia');
    escribir('u-apellido-paterno', 'Quispe');
    escribir('u-apellido-materno', 'Huaman');
    escribir('u-numero-documento', '45678912');
    escribir('u-email', 'Lucia@Francos.test');
    escribir('u-username', 'lquispe');
    escribir('u-contrasena', 'Clave1234');
    alternarRol('Ventas');
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsuarioFormModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(UsuarioFormModal);
    el = fixture.nativeElement as HTMLElement;
    guardados = [];
    cierres = 0;
    fixture.componentInstance.saved.subscribe((g) => guardados.push(g));
    fixture.componentInstance.closed.subscribe(() => cierres++);
  });

  afterEach(() => http.verify());

  describe('nuevo usuario', () => {
    it('muestra el título y los campos del alta, con el switch Activo', () => {
      abrir();

      expect(el.textContent).toContain('Nuevo usuario');
      expect(el.querySelector('input#u-email')).not.toBeNull();
      expect(el.querySelector('input#u-numero-documento')).not.toBeNull();
      expect(el.textContent).toContain('Puede ingresar al sistema');
    });

    it('no incluye el rol cliente entre las opciones y ofrece un switch por cada rol recibido', () => {
      abrir();

      expect(interruptorRol('Admin')).not.toBeNull();
      expect(interruptorRol('Ventas')).not.toBeNull();
      expect(interruptorRol('Inventario')).not.toBeNull();
      expect(el.textContent).not.toContain('Cliente');
    });

    it('permite activar varios roles a la vez', () => {
      abrir();
      alternarRol('Admin');
      alternarRol('Ventas');

      expect(interruptorRol('Admin').checked).toBe(true);
      expect(interruptorRol('Ventas').checked).toBe(true);
      expect(interruptorRol('Inventario').checked).toBe(false);
    });

    it('al guardar vacío muestra los errores y no llama al backend', () => {
      abrir();

      boton('Crear usuario').click();
      fixture.detectChanges();

      expect(el.textContent).toContain('Ingresar los nombres');
      expect(el.textContent).toContain('Ingresar el apellido paterno');
      expect(el.textContent).toContain('Ingresar el número de documento');
      expect(el.textContent).toContain('Email inválido');
      expect(el.textContent).toContain('Ingresar una contraseña');
      expect(el.textContent).toContain('Seleccionar al menos un rol');
      http.expectNone(URL);
    });

    it('crea el usuario, avisa al padre y cierra el modal', () => {
      abrir();
      llenarNuevo();

      boton('Crear usuario').click();
      const req = http.expectOne({ method: 'POST', url: URL });
      expect(req.request.body).toMatchObject({
        nombres: 'Lucia',
        email: 'lucia@francos.test',
        tipo_documento: 'dni',
        numero_documento: '45678912',
        username: 'lquispe',
        rol_ids: [2],
        estado: true,
      });
      req.flush(makeUsuarioDto());

      expect(guardados).toHaveLength(1);
      expect(guardados[0].modo).toBe('nuevo');
      expect(guardados[0].usuario.nombreCompleto).toBe('Lucia Quispe Huaman');
      expect(cierres).toBe(1);
    });

    it('marca "Email ya registrado" junto al campo cuando el backend responde 409', () => {
      abrir();
      llenarNuevo();

      boton('Crear usuario').click();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush(
          { message: 'Existe un usuario con ese mismo email' },
          { status: 409, statusText: 'Conflict' },
        );
      fixture.detectChanges();

      expect(el.textContent).toContain('Email ya registrado');
      expect(guardados).toHaveLength(0);
      expect(cierres).toBe(0);
    });

    it('el aviso de "ya registrado" se quita al corregir el campo', () => {
      abrir();
      llenarNuevo();
      boton('Crear usuario').click();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush(
          { message: 'Ya existe un usuario con ese nombre de usuario' },
          { status: 409, statusText: 'Conflict' },
        );
      fixture.detectChanges();
      expect(el.textContent).toContain('Username en uso');

      escribir('u-username', 'lquispe2');

      expect(el.textContent).not.toContain('Username en uso');
    });

    it('muestra el mensaje general si el error no corresponde a un campo', () => {
      abrir();
      llenarNuevo();

      boton('Crear usuario').click();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush({ message: 'Rol no asignable' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('Rol no asignable');
      expect(boton('Crear usuario').disabled).toBe(false);
    });

    it('al volver a abrir el modal el formulario está limpio', () => {
      abrir();
      escribir('u-nombres', 'Lucia');
      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();

      expect(el.querySelector<HTMLInputElement>('input#u-nombres')!.value).toBe('');
    });
  });

  describe('editar usuario', () => {
    const usuario = toUsuario(makeUsuarioDto());

    it('carga los datos y bloquea email y documento ("No editable")', () => {
      abrir(usuario);

      expect(el.textContent).toContain('Editar usuario');
      expect(el.querySelector<HTMLInputElement>('input#u-nombres')!.value).toBe('Lucia');
      expect(el.querySelector<HTMLInputElement>('input#u-email')!.disabled).toBe(true);
      expect(el.querySelector<HTMLInputElement>('input#u-numero-documento')!.disabled).toBe(true);
      expect(el.querySelector<HTMLSelectElement>('select#u-tipo-documento')!.disabled).toBe(true);
      expect(el.textContent).toContain('Dejar vacío para mantener la actual');
      expect(el.textContent).not.toContain('Puede ingresar al sistema');
    });

    it('guardar sin tocar nada no llama al backend y cierra', () => {
      abrir(usuario);

      boton('Guardar cambios').click();

      http.expectNone(`${URL}/u-1`);
      expect(guardados[0].modo).toBe('editar');
      expect(cierres).toBe(1);
    });

    it('si solo cambia el rol, hace únicamente el PUT de roles', () => {
      abrir(usuario);
      alternarRol('Ventas');
      alternarRol('Inventario');

      boton('Guardar cambios').click();

      http.expectNone({ method: 'PATCH', url: `${URL}/u-1` });
      const req = http.expectOne({ method: 'PUT', url: `${URL}/u-1/roles` });
      expect(req.request.body).toEqual({ rol_ids: [4] });
      req.flush(makeUsuarioDto({ roles: [{ id: 4, nombre: 'inventario' }] }));
      expect(guardados).toHaveLength(1);
    });

    it('permite sumar un rol adicional al que ya tenía, sin quitarle el que tenía', () => {
      abrir(usuario);
      alternarRol('Inventario');

      boton('Guardar cambios').click();

      const req = http.expectOne({ method: 'PUT', url: `${URL}/u-1/roles` });
      expect(req.request.body.rol_ids.sort()).toEqual([2, 4]);
    });

    it('no manda el PUT de roles si se desmarca y vuelve a marcar el mismo rol', () => {
      abrir(usuario);
      alternarRol('Ventas');
      alternarRol('Ventas');

      boton('Guardar cambios').click();

      http.expectNone({ method: 'PUT', url: `${URL}/u-1/roles` });
    });

    it('si cambia un dato, manda solo ese dato en el PATCH', () => {
      abrir(usuario);
      escribir('u-nombres', 'Lucía');

      boton('Guardar cambios').click();

      const req = http.expectOne({ method: 'PATCH', url: `${URL}/u-1` });
      expect(req.request.body).toEqual({ nombres: 'Lucía' });
      req.flush(makeUsuarioDto({ nombres: 'Lucía' }));
    });

    it('no deja guardar una contraseña nueva de menos de 8 caracteres', () => {
      abrir(usuario);
      escribir('u-contrasena', 'corta');

      boton('Guardar cambios').click();
      fixture.detectChanges();

      expect(el.textContent).toContain('Mínimo 8 caracteres');
      http.expectNone(`${URL}/u-1`);
    });
  });

  it('Cancelar cierra sin guardar', () => {
    abrir();

    boton('Cancelar').click();

    expect(cierres).toBe(1);
    expect(guardados).toHaveLength(0);
  });
});
