import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../../environments/environment';
import { UsuarioInternoDto } from '../../interfaces/usuario-dto.interface';
import { makePaginaDto, makeRolDto, makeUsuarioDto } from '../../testing/usuario-fixtures';
import { GestionarUsuarios } from './gestionar-usuarios';

const USUARIOS = `${environment.apiUrl}/usuarios`;
const ROLES = `${environment.apiUrl}/roles`;
const ME = `${environment.apiUrl}/auth/me`;

const LUCIA = makeUsuarioDto();
const ADMIN = makeUsuarioDto({
  id: 'u-admin',
  nombres: 'Admin',
  apellido_paterno: 'Sistema',
  apellido_materno: 'Franco',
  username: 'admin',
  email: 'admin@francos.test',
  roles: [{ id: 1, nombre: 'admin' }],
});
const PEDRO = makeUsuarioDto({
  id: 'u-pedro',
  nombres: 'Pedro',
  username: 'pedro',
  estado: false,
});

describe('GestionarUsuarios', () => {
  let fixture: ComponentFixture<GestionarUsuarios>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const listados = () =>
    http.match((r) => r.url === USUARIOS && r.method === 'GET' && r.params.get('limit') === '8');
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    );

  /** Crea la pantalla y responde lo que pide al abrirse. */
  function crear(usuarios: UsuarioInternoDto[] = [ADMIN, LUCIA, PEDRO], total = usuarios.length) {
    fixture = TestBed.createComponent(GestionarUsuarios);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http.expectOne(ROLES).flush({
      data: [
        makeRolDto({ id: 1, nombre: 'admin' }),
        makeRolDto({ id: 2, nombre: 'ventas' }),
        makeRolDto({ id: 3, nombre: 'cliente' }),
      ],
    });
    http.expectOne(ME).flush({
      nombre_completo: 'Admin Sistema Franco',
      nombres: 'Admin',
      apellido_paterno: 'Sistema',
      apellido_materno: 'Franco',
      email: 'admin@francos.test',
      username: 'admin',
      roles: ['admin'],
    });
    const [pedido] = listados();
    pedido.flush(makePaginaDto(usuarios, { total }));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GestionarUsuarios],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga la primera página con 8 por página y la muestra con rol y estado', () => {
    crear();

    const texto = el.textContent ?? '';
    expect(texto).toContain('Gestionar usuarios internos');
    expect(texto).toContain('Lucia Quispe Huaman');
    expect(texto).toContain('@lquispe');
    expect(texto).toContain('lucia@francos.test');
    expect(texto).toContain('Ventas');
    expect(texto).toContain('3 usuarios');
    expect(texto).toContain('Activo');
    expect(texto).toContain('Inactivo');
  });

  it('muestra el total de usuarios en la pestaña "Usuarios"', () => {
    crear([LUCIA, ADMIN], 2);

    const pestana = Array.from(el.querySelectorAll('[role="tab"]')).find((t) =>
      t.textContent?.includes('Usuarios'),
    );
    expect(pestana?.textContent).toContain('2');
  });

  it('no ofrece el rol cliente en el filtro de roles', () => {
    crear();

    const opciones = Array.from(el.querySelectorAll<HTMLOptionElement>('select option')).map((o) =>
      o.textContent?.trim(),
    );
    expect(opciones).toContain('Ventas');
    expect(opciones).not.toContain('Cliente');
  });

  it('al filtrar por estado vuelve a consultar con estado=true desde la página 1', () => {
    crear();
    const select = el.querySelectorAll<HTMLSelectElement>('select')[1];

    select.value = 'activo';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const [pedido] = listados();
    expect(pedido.request.params.get('estado')).toBe('true');
    expect(pedido.request.params.get('page')).toBe('1');
    pedido.flush(makePaginaDto([LUCIA]));
  });

  it('al filtrar por rol manda el nombre del rol', () => {
    crear();
    const select = el.querySelectorAll<HTMLSelectElement>('select')[0];

    select.value = 'ventas';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const [pedido] = listados();
    expect(pedido.request.params.get('rol')).toBe('ventas');
    pedido.flush(makePaginaDto([LUCIA]));
  });

  it('la búsqueda espera 300 ms sin escribir antes de consultar', () => {
    vi.useFakeTimers();
    try {
      crear();
      const input = el.querySelector<HTMLInputElement>('input[placeholder^="Buscar"]')!;

      input.value = 'luc';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      vi.advanceTimersByTime(299);
      expect(listados()).toHaveLength(0);

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      const [pedido] = listados();
      expect(pedido.request.params.get('search')).toBe('luc');
      pedido.flush(makePaginaDto([LUCIA]));
    } finally {
      vi.useRealTimers();
    }
  });

  it('"Limpiar filtros" aparece con un filtro activo y los deja todos en blanco', () => {
    crear();
    expect(boton('Limpiar filtros')).toBeUndefined();
    const select = el.querySelectorAll<HTMLSelectElement>('select')[1];
    select.value = 'inactivo';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    listados()[0].flush(makePaginaDto([PEDRO]));
    fixture.detectChanges();

    boton('Limpiar filtros')!.click();
    fixture.detectChanges();

    const [pedido] = listados();
    expect(pedido.request.params.has('estado')).toBe(false);
    pedido.flush(makePaginaDto([ADMIN, LUCIA, PEDRO]));
  });

  it('cambiar de página consulta esa página', () => {
    crear([LUCIA], 20);
    // 20 usuarios a 8 por página = 3 páginas.
    (fixture.componentInstance as unknown as { irAPagina(p: number): void }).irAPagina(2);
    fixture.detectChanges();

    const [pedido] = listados();
    expect(pedido.request.params.get('page')).toBe('2');
    pedido.flush(makePaginaDto([LUCIA], { total: 20, page: 2, total_pages: 3 }));
  });

  it('sin resultados muestra el estado vacío', () => {
    crear([], 0);

    expect(el.textContent).toContain('No hay usuarios que coincidan con los filtros');
    expect(el.textContent).toContain('0 usuarios');
  });

  it('si falla la carga muestra el error y Reintentar vuelve a consultar', () => {
    fixture = TestBed.createComponent(GestionarUsuarios);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne(ROLES).flush({ data: [] });
    http.expectOne(ME).flush({ username: 'admin', roles: ['admin'] });
    listados()[0].flush({ message: 'Error interno' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('Error interno');

    boton('Reintentar')!.click();
    fixture.detectChanges();
    const [pedido] = listados();
    pedido.flush(makePaginaDto([LUCIA]));
    fixture.detectChanges();

    expect(el.textContent).toContain('Lucia Quispe Huaman');
  });

  describe('acciones por fila', () => {
    const etiquetas = (id: string) => {
      const mapa = (
        fixture.componentInstance as unknown as {
          accionesPorUsuario(): Map<string, { label?: string }[]>;
        }
      ).accionesPorUsuario();
      return (mapa.get(id) ?? []).map((accion) => accion.label).filter(Boolean);
    };

    it('un usuario activo se puede editar y desactivar', () => {
      crear();

      expect(etiquetas('u-1')).toEqual(['Editar', 'Desactivar']);
    });

    it('un usuario inactivo se puede editar y reactivar', () => {
      crear();

      expect(etiquetas('u-pedro')).toEqual(['Editar', 'Reactivar']);
    });

    it('el usuario que inició sesión no se puede desactivar a sí mismo', () => {
      crear();

      expect(etiquetas('u-admin')).toEqual(['Editar']);
    });
  });

  it('"Nuevo usuario" abre el formulario de alta', () => {
    crear();

    boton('Nuevo usuario')!.click();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Nuevo usuario');
  });

  it('reactivar muestra el aviso y recarga la lista', () => {
    crear();
    const acciones = (
      fixture.componentInstance as unknown as {
        accionesPorUsuario(): Map<string, { label?: string; onSelect?: () => void }[]>;
      }
    ).accionesPorUsuario();

    acciones.get('u-pedro')!.find((a) => a.label === 'Reactivar')!.onSelect!();
    http
      .expectOne({ method: 'PATCH', url: `${USUARIOS}/u-pedro/activate` })
      .flush(makeUsuarioDto({ id: 'u-pedro', nombres: 'Pedro', estado: true }));
    fixture.detectChanges();

    expect(el.textContent).toContain('Usuario Pedro Quispe Huaman reactivado');
    listados()[0].flush(makePaginaDto([ADMIN, LUCIA, PEDRO]));
  });

  it('si no se puede reactivar muestra el error', () => {
    crear();
    const acciones = (
      fixture.componentInstance as unknown as {
        accionesPorUsuario(): Map<string, { label?: string; onSelect?: () => void }[]>;
      }
    ).accionesPorUsuario();

    acciones.get('u-pedro')!.find((a) => a.label === 'Reactivar')!.onSelect!();
    http
      .expectOne({ method: 'PATCH', url: `${USUARIOS}/u-pedro/activate` })
      .flush({ message: 'No se pudo' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(el.textContent).toContain('No se pudo');
  });

  it('cambia a la pestaña "Roles y permisos"', () => {
    crear();
    const pestana = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((t) =>
      t.textContent?.includes('Roles y permisos'),
    )!;

    pestana.click();
    fixture.detectChanges();

    expect(el.querySelector('app-usuarios-roles-permisos')).not.toBeNull();
    expect(el.querySelector('app-ds-filter-bar')).toBeNull();

    // La pestaña pide el árbol de rutas, cuántos usuarios tiene cada rol y los permisos del primero.
    http.expectOne(`${environment.apiUrl}/rutas/tree`).flush([]);
    http
      .match((r) => r.url === USUARIOS && r.params.get('limit') === '1')
      .forEach((r) => r.flush(makePaginaDto([])));
    http.expectOne(`${ROLES}/1/rutas`).flush([]);
  });
});
