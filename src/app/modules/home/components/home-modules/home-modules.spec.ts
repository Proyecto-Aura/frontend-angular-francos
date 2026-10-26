import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HomeModules } from './home-modules';
import { environment } from '../../../../../environments/environment';
import { RutaNodo } from '../../../../core/interfaces/ruta-nodo.interface';

const TREE_URL = `${environment.apiUrl}/rutas/mi-menu`;

function nodo(overrides: Partial<RutaNodo>): RutaNodo {
  return {
    id: 1,
    nombre: 'x',
    etiqueta: 'X',
    icono: 'package',
    descripcion: null,
    estado: true,
    parent_id: null,
    children: [],
    ...overrides,
  };
}

describe('HomeModules', () => {
  let httpMock: HttpTestingController;

  function create() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HomeModules);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('renders the fallback modules (Ventas, Inventario, Gestión Estratégica) before the API responds', () => {
    const fixture = create();
    const cards = fixture.nativeElement.querySelectorAll('app-home-cards');
    expect(cards.length).toBe(3);
    httpMock.expectOne(TREE_URL).flush([]);
  });

  it('replaces the cards with what the API returns, using etiqueta/descripcion', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush([
      nodo({ nombre: 'inventario', etiqueta: 'Inventario (API)', descripcion: 'Desc API' }),
      nodo({
        nombre: 'estrategico',
        etiqueta: 'Gestión Estratégica (API)',
        descripcion: 'Desc estrategica API',
      }),
    ]);
    fixture.detectChanges();

    const modules = fixture.componentInstance['modules']();
    expect(modules).toEqual([
      {
        icon: '/icons/module_inventario.svg',
        title: 'Inventario (API)',
        description: 'Desc API',
        routerLink: '/inventario',
      },
      {
        icon: '/icons/module-gestion-estrategica.png',
        title: 'Gestión Estratégica (API)',
        description: 'Desc estrategica API',
        routerLink: '/gestion-estrategica',
      },
    ]);
  });

  it('reorders the cards to Ventas, Inventario, Gestión Estratégica regardless of the order the API sends them in', () => {
    const fixture = create();
    httpMock
      .expectOne(TREE_URL)
      .flush([
        nodo({ nombre: 'estrategico', etiqueta: 'Gestión Estratégica' }),
        nodo({ nombre: 'ventas', etiqueta: 'Ventas' }),
        nodo({ nombre: 'inventario', etiqueta: 'Inventario' }),
      ]);
    fixture.detectChanges();

    const titles = fixture.componentInstance['modules']().map((m: { title: string }) => m.title);
    expect(titles).toEqual(['Ventas', 'Inventario', 'Gestión Estratégica']);
  });

  it('shows the Configuración card, last, when the API returns it', () => {
    const fixture = create();
    httpMock
      .expectOne(TREE_URL)
      .flush([
        nodo({ nombre: 'configuracion', etiqueta: 'Configuración', descripcion: 'Desc config' }),
        nodo({ nombre: 'ventas', etiqueta: 'Ventas' }),
      ]);
    fixture.detectChanges();

    const modules = fixture.componentInstance['modules']();
    expect(modules.map((m: { title: string }) => m.title)).toEqual(['Ventas', 'Configuración']);
    expect(modules[1]).toEqual({
      icon: '/icons/module_configuracion.svg',
      title: 'Configuración',
      description: 'Desc config',
      routerLink: '/configuracion',
    });
  });

  it('filters out a module the API returns that has no known MODULE_CARD_INFO entry (no real page yet)', () => {
    const fixture = create();
    httpMock
      .expectOne(TREE_URL)
      .flush([
        nodo({ nombre: 'inventario' }),
        nodo({ nombre: 'un-modulo-que-no-existe-en-el-front' }),
      ]);
    fixture.detectChanges();

    expect(fixture.componentInstance['modules']()).toHaveLength(1);
  });

  it('keeps the fallback when the API returns nothing matching a known module', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush([nodo({ nombre: 'un-modulo-que-no-existe-en-el-front' })]);
    fixture.detectChanges();

    expect(fixture.componentInstance['modules']().length).toBe(3);
  });

  it('keeps the fallback when the API call fails', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance['modules']().length).toBe(3);
  });
});
