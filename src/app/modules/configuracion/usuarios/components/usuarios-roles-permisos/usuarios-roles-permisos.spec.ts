import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { RutaNodo } from '../../../../../core/interfaces/ruta-nodo.interface';
import { Rol } from '../../interfaces/usuario.interface';
import { toRol } from '../../mappers/usuario.mapper';
import {
  makeNodo,
  makePaginaDto,
  makeRolDto,
  makeUsuarioDto,
} from '../../testing/usuario-fixtures';
import { UsuariosRolesPermisos } from './usuarios-roles-permisos';

const API = environment.apiUrl;
const ROLES: Rol[] = [
  toRol(makeRolDto({ id: 1, nombre: 'admin', descripcion: 'Acceso total al sistema' })),
  toRol(makeRolDto({ id: 2, nombre: 'ventas', descripcion: 'Gestión de ventas' })),
];

// ventas(10) -> catalogo(11), clientes(12)
const ARBOL: RutaNodo[] = [
  makeNodo({
    id: 10,
    nombre: 'ventas',
    etiqueta: 'Ventas',
    children: [
      makeNodo({ id: 11, nombre: 'catalogo', etiqueta: 'Catálogo', parent_id: 10 }),
      makeNodo({ id: 12, nombre: 'clientes', etiqueta: 'Clientes', parent_id: 10 }),
    ],
  }),
  makeNodo({ id: 20, nombre: 'baja', etiqueta: 'Módulo dado de baja', estado: false }),
];

describe('UsuariosRolesPermisos', () => {
  let fixture: ComponentFixture<UsuariosRolesPermisos>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;
  const interruptor = (etiqueta: string) =>
    Array.from(el.querySelectorAll<HTMLLabelElement>('app-ds-switch label'))
      .find((l) => l.textContent?.includes(etiqueta))!
      .querySelector<HTMLInputElement>('input')!;
  const accesos = (rolId: number, rutas: number[]) =>
    rutas.map((ruta_id, i) => ({ id: i + 1, rol_id: rolId, ruta_id, estado: true }));

  /** Abre la pestaña con los roles dados; el rol elegido por defecto es el primero. */
  function crear(rutasDelPrimero: number[] = [], roles = ROLES) {
    fixture = TestBed.createComponent(UsuariosRolesPermisos);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('roles', roles);
    fixture.detectChanges();

    http.expectOne(`${API}/rutas/tree`).flush(ARBOL);
    http
      .match((r) => r.url === `${API}/usuarios` && r.params.get('limit') === '1')
      .forEach((r) =>
        r.flush(
          makePaginaDto([makeUsuarioDto()], {
            total: r.request.params.get('rol') === 'ventas' ? 3 : 1,
          }),
        ),
      );
    http
      .expectOne(`${API}/roles/${roles[0].id}/rutas`)
      .flush(accesos(roles[0].id, rutasDelPrimero));
    fixture.detectChanges();
  }

  const elegirRol = (etiqueta: string, rolId: number, rutas: number[]) => {
    Array.from(el.querySelectorAll<HTMLButtonElement>('ul[aria-label="Roles"] button'))
      .find((b) => b.textContent?.includes(etiqueta))!
      .click();
    http.expectOne(`${API}/roles/${rolId}/rutas`).flush(accesos(rolId, rutas));
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsuariosRolesPermisos],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista los roles con su descripción y cuántos usuarios tiene cada uno', () => {
    crear();

    const texto = el.textContent ?? '';
    expect(texto).toContain('Admin');
    expect(texto).toContain('Acceso total al sistema');
    expect(texto).toContain('Gestión de ventas');
    expect(texto).toContain('3 usuarios');
    expect(texto).toContain('1 usuario');
  });

  it('muestra los módulos vigentes expandidos y oculta los dados de baja', () => {
    crear();

    expect(el.textContent).toContain('Ventas');
    expect(el.textContent).toContain('Catálogo');
    expect(el.textContent).toContain('Clientes');
    expect(el.textContent).not.toContain('Módulo dado de baja');
  });

  it('el rol Admin se ve con todo prendido y sin poder editarse', () => {
    crear([10, 11, 12]);

    expect(interruptor('Catálogo').checked).toBe(true);
    expect(interruptor('Catálogo').disabled).toBe(true);
    expect(el.textContent).toContain('sus permisos no se pueden modificar');
    expect(boton('Guardar permisos').disabled).toBe(true);
  });

  it('marca como activas las pantallas que el rol tiene y un módulo con alguna pantalla', () => {
    crear([], ROLES);
    elegirRol('Ventas', 2, [11]);

    expect(interruptor('Catálogo').checked).toBe(true);
    expect(interruptor('Clientes').checked).toBe(false);
    expect(interruptor('Ventas').checked).toBe(true);
    expect(interruptor('Catálogo').disabled).toBe(false);
  });

  it('prender una pantalla habilita Guardar y Descartar la deja como estaba', () => {
    crear();
    elegirRol('Ventas', 2, [11]);
    expect(boton('Guardar permisos').disabled).toBe(true);

    interruptor('Clientes').click();
    fixture.detectChanges();
    expect(interruptor('Clientes').checked).toBe(true);
    expect(boton('Guardar permisos').disabled).toBe(false);

    boton('Descartar').click();
    fixture.detectChanges();
    expect(interruptor('Clientes').checked).toBe(false);
    expect(boton('Guardar permisos').disabled).toBe(true);
  });

  it('prender un módulo prende todas sus pantallas', () => {
    crear();
    elegirRol('Ventas', 2, []);

    interruptor('Ventas').click();
    fixture.detectChanges();

    expect(interruptor('Catálogo').checked).toBe(true);
    expect(interruptor('Clientes').checked).toBe(true);
  });

  it('guardar otorga lo agregado y revoca lo quitado, y vuelve a leer lo guardado', () => {
    crear();
    elegirRol('Ventas', 2, [11]);
    interruptor('Clientes').click();
    interruptor('Catálogo').click();
    fixture.detectChanges();

    boton('Guardar permisos').click();
    http.expectOne({ method: 'POST', url: `${API}/roles/2/rutas/12` }).flush({});
    http.expectOne({ method: 'DELETE', url: `${API}/roles/2/rutas/11` }).flush({});
    http.expectOne(`${API}/roles/2/rutas`).flush(accesos(2, [12]));
    fixture.detectChanges();

    expect(el.textContent).toContain('Permisos guardados correctamente');
    expect(boton('Guardar permisos').disabled).toBe(true);
    expect(interruptor('Clientes').checked).toBe(true);
  });

  it('si algo falla al guardar avisa y vuelve a leer lo que quedó guardado', () => {
    crear();
    elegirRol('Ventas', 2, []);
    interruptor('Clientes').click();
    fixture.detectChanges();

    boton('Guardar permisos').click();
    http
      .expectOne({ method: 'POST', url: `${API}/roles/2/rutas/12` })
      .flush({ message: 'Ruta no encontrada' }, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${API}/roles/2/rutas`).flush([]);
    fixture.detectChanges();

    expect(el.textContent).toContain('Ruta no encontrada');
    expect(interruptor('Clientes').checked).toBe(false);
  });

  it('"Contraer todo" esconde las pantallas y "Expandir todo" las vuelve a mostrar', () => {
    crear();

    boton('Contraer todo').click();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Catálogo');

    boton('Expandir todo').click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Catálogo');
  });

  it('si no carga el árbol muestra el error y se puede reintentar', () => {
    fixture = TestBed.createComponent(UsuariosRolesPermisos);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http
      .expectOne(`${API}/rutas/tree`)
      .flush({ message: 'Sin conexión' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el.textContent).toContain('Sin conexión');

    boton('Reintentar').click();
    http.expectOne(`${API}/rutas/tree`).flush(ARBOL);
    fixture.detectChanges();

    expect(el.textContent).toContain('Ventas');
  });
});
