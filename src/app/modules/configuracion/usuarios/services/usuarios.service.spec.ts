import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { USUARIO_FORM_VACIO, UsuarioForm, usuarioFormDe } from '../interfaces/usuario.interface';
import { toUsuario } from '../mappers/usuario.mapper';
import { makePaginaDto, makeRolDto, makeUsuarioDto } from '../testing/usuario-fixtures';
import { UsuariosService } from './usuarios.service';

const URL = `${environment.apiUrl}/usuarios`;

describe('UsuariosService', () => {
  let service: UsuariosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UsuariosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar() pide la página con 8 por página y convierte la respuesta', () => {
    let total = 0;
    service
      .listar({ busqueda: '', rol: '', estado: '', pagina: 2 })
      .subscribe((pagina) => (total = pagina.total));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('8');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('rol')).toBe(false);
    expect(req.request.params.has('estado')).toBe(false);
    req.flush(makePaginaDto([makeUsuarioDto()], { total: 9, page: 2, total_pages: 2 }));

    expect(total).toBe(9);
  });

  it('listar() manda búsqueda (sin espacios sobrantes), rol y estado', () => {
    service
      .listar({ busqueda: ' lucia ', rol: 'ventas', estado: 'inactivo', pagina: 1 })
      .subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('search')).toBe('lucia');
    expect(req.request.params.get('rol')).toBe('ventas');
    expect(req.request.params.get('estado')).toBe('false');
    req.flush(makePaginaDto([]));
  });

  it('listar() traduce "activo" a estado=true', () => {
    service.listar({ busqueda: '', rol: '', estado: 'activo', pagina: 1 }).subscribe();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('estado')).toBe('true');
    req.flush(makePaginaDto([]));
  });

  it('contarPorRol() devuelve el total del rol pidiendo una sola fila', () => {
    let cantidad = -1;
    service.contarPorRol('ventas').subscribe((n) => (cantidad = n));

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('rol')).toBe('ventas');
    expect(req.request.params.get('limit')).toBe('1');
    req.flush(makePaginaDto([makeUsuarioDto()], { total: 4 }));

    expect(cantidad).toBe(4);
  });

  it('roles() deja fuera el rol cliente y los roles dados de baja', () => {
    let nombres: string[] = [];
    service.roles().subscribe((roles) => (nombres = roles.map((r) => r.nombre)));

    http.expectOne(`${environment.apiUrl}/roles`).flush({
      data: [
        makeRolDto({ id: 1, nombre: 'admin' }),
        makeRolDto({ id: 3, nombre: 'cliente' }),
        makeRolDto({ id: 9, nombre: 'viejo', estado: false }),
        makeRolDto({ id: 2, nombre: 'ventas' }),
      ],
    });

    expect(nombres).toEqual(['admin', 'ventas']);
  });

  it('crear() envía los datos al backend con el rol como lista', () => {
    const form: UsuarioForm = {
      ...USUARIO_FORM_VACIO,
      nombres: 'Lucia',
      apellidoPaterno: 'Quispe',
      apellidoMaterno: 'Huaman',
      numeroDocumento: '45678912',
      email: 'lucia@francos.test',
      username: 'lquispe',
      contrasena: 'Clave1234',
      rolId: '2',
    };
    let nombre = '';
    service.crear(form).subscribe((u) => (nombre = u.nombreCompleto));

    const req = http.expectOne({ method: 'POST', url: URL });
    expect(req.request.body).toMatchObject({
      numero_documento: '45678912',
      email: 'lucia@francos.test',
      estado: true,
      rol_ids: [2],
    });
    req.flush(makeUsuarioDto());

    expect(nombre).toBe('Lucia Quispe Huaman');
  });

  describe('editar()', () => {
    const original = toUsuario(makeUsuarioDto());

    it('manda PATCH con los datos cambiados y no toca los roles si el rol sigue igual', () => {
      const form = { ...usuarioFormDe(original), nombres: 'Lucía' };
      service.editar(original, form, false).subscribe();

      const req = http.expectOne({ method: 'PATCH', url: `${URL}/u-1` });
      expect(req.request.body).toEqual({ nombres: 'Lucía' });
      req.flush(makeUsuarioDto({ nombres: 'Lucía' }));
      http.expectNone({ method: 'PUT', url: `${URL}/u-1/roles` });
    });

    it('si solo cambió el rol, manda únicamente el PUT de roles', () => {
      const form = { ...usuarioFormDe(original), rolId: '4' };
      let rol = 0;
      service.editar(original, form, true).subscribe((u) => (rol = u.roles[0].id));

      http.expectNone({ method: 'PATCH', url: `${URL}/u-1` });
      const req = http.expectOne({ method: 'PUT', url: `${URL}/u-1/roles` });
      expect(req.request.body).toEqual({ rol_ids: [4] });
      req.flush(makeUsuarioDto({ roles: [{ id: 4, nombre: 'inventario' }] }));

      expect(rol).toBe(4);
    });

    it('si cambiaron datos y rol, hace primero el PATCH y luego el PUT', () => {
      const form = { ...usuarioFormDe(original), username: 'lucia.q', rolId: '4' };
      service.editar(original, form, true).subscribe();

      http.expectOne({ method: 'PATCH', url: `${URL}/u-1` }).flush(makeUsuarioDto());
      http
        .expectOne({ method: 'PUT', url: `${URL}/u-1/roles` })
        .flush(makeUsuarioDto({ roles: [{ id: 4, nombre: 'inventario' }] }));
    });

    it('si no cambió nada no llama al backend', () => {
      let resultado: unknown;
      service.editar(original, usuarioFormDe(original), false).subscribe((u) => (resultado = u));

      expect(resultado).toBe(original);
    });
  });

  it('desactivar() usa DELETE y reactivar() usa PATCH /activate', () => {
    let activo: boolean | undefined;
    service.desactivar('u-1').subscribe((u) => (activo = u.activo));
    http
      .expectOne({ method: 'DELETE', url: `${URL}/u-1` })
      .flush(makeUsuarioDto({ estado: false }));
    expect(activo).toBe(false);

    service.reactivar('u-1').subscribe((u) => (activo = u.activo));
    http.expectOne({ method: 'PATCH', url: `${URL}/u-1/activate` }).flush(makeUsuarioDto());
    expect(activo).toBe(true);
  });
});
