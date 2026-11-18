import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LucidePackage } from '@lucide/angular';
import { ModuleLayout } from './module-layout';
import { SidebarLink } from '../../shared/ui/sidebar/sidebar';
import { environment } from '../../../environments/environment';
import { RutaNodo } from '../../core/interfaces/ruta-nodo.interface';
import { MeResponseDto } from '../../modules/auth/interfaces/usuario-dto.interface';

const TREE_URL = `${environment.apiUrl}/rutas/mi-menu`;
const ME_URL = `${environment.apiUrl}/auth/me`;

function makeMe(overrides: Partial<MeResponseDto> = {}): MeResponseDto {
  return {
    nombre_completo: "Admin Sistema Franco's",
    nombres: 'Admin',
    apellido_paterno: 'Sistema',
    apellido_materno: "Franco's",
    email: 'admin@francos.test',
    username: 'admin',
    roles: ['admin'],
    foto_url: null,
    ...overrides,
  };
}

describe('ModuleLayout', () => {
  let httpMock: HttpTestingController;

  function create(data: {
    sidebarLinks?: SidebarLink[];
    sidebarTitle?: string;
    moduleNombre?: string;
  }) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ModuleLayout);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('without moduleNombre, uses the hardcoded route data and does not call /rutas/mi-menu (but still fetches /auth/me)', () => {
    const links: SidebarLink[] = [{ label: 'Clientes', path: '/ventas/clientes' }];
    const fixture = create({ sidebarLinks: links, sidebarTitle: 'Gestión de Ventas' });

    expect(fixture.componentInstance.links()).toEqual(links);
    expect(fixture.componentInstance.sectionLabel()).toBe('Gestión de Ventas');
    httpMock.expectNone(TREE_URL);
    httpMock.expectOne(ME_URL).flush(makeMe());
  });

  it('falls back to [] / null when there is no route data at all', () => {
    const fixture = create({});
    expect(fixture.componentInstance.links()).toEqual([]);
    expect(fixture.componentInstance.sectionLabel()).toBeNull();
    httpMock.expectOne(ME_URL).flush(makeMe());
  });

  it('with moduleNombre, replaces the fallback once the API returns a matching module', () => {
    const fixture = create({
      sidebarLinks: [{ label: 'fallback', path: 'x' }],
      moduleNombre: 'inventario',
    });

    const tree: RutaNodo[] = [
      {
        id: 1,
        nombre: 'inventario',
        etiqueta: 'Gestión de Inventario (API)',
        icono: 'package',
        descripcion: 'Control de stock y productos',
        estado: true,
        parent_id: null,
        children: [
          {
            id: 2,
            nombre: 'stock-productos',
            etiqueta: 'Stock de productos',
            icono: 'package',
            descripcion: null,
            estado: true,
            parent_id: 1,
            children: [],
          },
        ],
      },
    ];
    httpMock.expectOne(TREE_URL).flush(tree);
    httpMock.expectOne(ME_URL).flush(makeMe());

    expect(fixture.componentInstance.sectionLabel()).toBe('Gestión de Inventario (API)');
    expect(fixture.componentInstance.links()).toEqual([
      { label: 'Stock de productos', icon: LucidePackage, path: 'stock-productos' },
    ]);
  });

  it('builds the Insumos sidebar from the top-level insumos module', () => {
    const fixture = create({
      sidebarLinks: [{ label: 'fallback', path: 'x' }],
      moduleNombre: 'insumos',
    });

    const tree: RutaNodo[] = [
      {
        id: 1,
        nombre: 'insumos',
        etiqueta: 'Gestión de Insumos',
        icono: 'package',
        descripcion: 'Gestión de insumos y su stock',
        estado: true,
        parent_id: null,
        children: [
          {
            id: 2,
            nombre: 'stock-insumos',
            etiqueta: 'Stock de insumos',
            icono: 'package',
            descripcion: null,
            estado: true,
            parent_id: 1,
            children: [],
          },
          {
            id: 3,
            nombre: 'solicitudes-insumos',
            etiqueta: 'Solicitudes de insumos',
            icono: 'package',
            descripcion: null,
            estado: true,
            parent_id: 1,
            children: [],
          },
        ],
      },
    ];
    httpMock.expectOne(TREE_URL).flush(tree);
    httpMock.expectOne(ME_URL).flush(makeMe());

    expect(fixture.componentInstance.sectionLabel()).toBe('Gestión de Insumos');
    expect(fixture.componentInstance.links()).toEqual([
      { label: 'Stock de insumos', icon: LucidePackage, path: 'stock-insumos' },
      { label: 'Solicitudes de insumos', icon: LucidePackage, path: 'solicitudes-insumos' },
    ]);
  });

  it('only uses the node of its own module when the menu has both Inventario and Insumos', () => {
    const fixture = create({
      sidebarLinks: [{ label: 'fallback', path: 'x' }],
      moduleNombre: 'insumos',
    });

    const tree: RutaNodo[] = [
      {
        id: 1,
        nombre: 'inventario',
        etiqueta: 'Gestión de Inventario',
        icono: 'package',
        descripcion: 'Control de stock y productos',
        estado: true,
        parent_id: null,
        children: [
          {
            id: 2,
            nombre: 'stock-productos',
            etiqueta: 'Stock de productos',
            icono: 'package',
            descripcion: null,
            estado: true,
            parent_id: 1,
            children: [],
          },
        ],
      },
      {
        id: 3,
        nombre: 'insumos',
        etiqueta: 'Gestión de Insumos',
        icono: 'package',
        descripcion: 'Gestión de insumos y su stock',
        estado: true,
        parent_id: null,
        children: [
          {
            id: 4,
            nombre: 'stock-insumos',
            etiqueta: 'Stock de insumos',
            icono: 'package',
            descripcion: null,
            estado: true,
            parent_id: 3,
            children: [],
          },
        ],
      },
    ];
    httpMock.expectOne(TREE_URL).flush(tree);
    httpMock.expectOne(ME_URL).flush(makeMe());

    expect(fixture.componentInstance.sectionLabel()).toBe('Gestión de Insumos');
    expect(fixture.componentInstance.links()).toEqual([
      { label: 'Stock de insumos', icon: LucidePackage, path: 'stock-insumos' },
    ]);
  });

  it('keeps the fallback when the API tree has no node matching moduleNombre', () => {
    const fallback: SidebarLink[] = [{ label: 'fallback', path: 'x' }];
    const fixture = create({
      sidebarLinks: fallback,
      sidebarTitle: 'Fallback title',
      moduleNombre: 'ventas',
    });

    httpMock.expectOne(TREE_URL).flush([
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
    ]);
    httpMock.expectOne(ME_URL).flush(makeMe());

    expect(fixture.componentInstance.links()).toEqual(fallback);
    expect(fixture.componentInstance.sectionLabel()).toBe('Fallback title');
  });

  it('keeps the fallback when the /rutas/mi-menu call fails', () => {
    const fallback: SidebarLink[] = [{ label: 'fallback', path: 'x' }];
    const fixture = create({ sidebarLinks: fallback, moduleNombre: 'inventario' });

    httpMock.expectOne(TREE_URL).flush('error', { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(ME_URL).flush(makeMe());

    expect(fixture.componentInstance.links()).toEqual(fallback);
  });

  it('sets userName/userRole from /auth/me, capitalizing the first role', () => {
    const fixture = create({});
    httpMock.expectOne(ME_URL).flush(makeMe({ nombre_completo: 'Juan Perez', roles: ['ventas'] }));

    expect(fixture.componentInstance.userName()).toBe('Juan Perez');
    expect(fixture.componentInstance.userRole()).toBe('Ventas');
  });

  it('keeps the placeholder userName/userRole when /auth/me fails', () => {
    const fixture = create({});
    httpMock.expectOne(ME_URL).flush('error', { status: 500, statusText: 'Server Error' });

    expect(fixture.componentInstance.userName()).toBe('Usuario');
    expect(fixture.componentInstance.userRole()).toBe('');
  });

  it('sets avatarUrl from the foto_url that /auth/me responds', () => {
    const fixture = create({});
    const url = 'http://localhost:9000/francos-media/usuarios/a.png';
    httpMock.expectOne(ME_URL).flush(makeMe({ foto_url: url }));

    expect(fixture.componentInstance.avatarUrl()).toBe(url);
  });

  it('keeps avatarUrl null when /auth/me responds with no photo', () => {
    const fixture = create({});
    httpMock.expectOne(ME_URL).flush(makeMe());

    expect(fixture.componentInstance.avatarUrl()).toBeNull();
  });
});
