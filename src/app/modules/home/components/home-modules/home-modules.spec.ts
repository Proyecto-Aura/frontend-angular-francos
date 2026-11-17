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

  it('shows a loading state and no module cards before the API responds', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelectorAll('app-home-cards').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Cargando módulos…');
    httpMock.expectOne(TREE_URL).flush([]);
  });

  it('shows the empty state and a 0 counter when the menu is empty (user without permissions)', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush([]);
    fixture.detectChanges();

    expect(fixture.componentInstance['modules']()).toEqual([]);
    expect(fixture.nativeElement.querySelectorAll('app-home-cards').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'Aún no tienes módulos asignados. Contacta al administrador.',
    );
    expect(fixture.nativeElement.textContent).toContain('0 módulos');
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

  it('shows the Producción card when the API returns it (OFT0-263)', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush([
      nodo({ nombre: 'ventas', etiqueta: 'Ventas' }),
      nodo({
        nombre: 'produccion',
        etiqueta: 'Producción',
        descripcion: 'Control de producción',
      }),
    ]);
    fixture.detectChanges();

    const modules = fixture.componentInstance['modules']();
    expect(modules.map((m: { title: string }) => m.title)).toEqual(['Ventas', 'Producción']);
    expect(modules[1]).toEqual({
      icon: '/icons/module_produccion.svg',
      title: 'Producción',
      description: 'Control de producción',
      routerLink: '/produccion',
    });
  });

  it('shows the Despachos card when the API returns it (HU-A-023), ordered between Producción y Configuración', () => {
    const fixture = create();
    httpMock
      .expectOne(TREE_URL)
      .flush([
        nodo({ nombre: 'configuracion', etiqueta: 'Configuración' }),
        nodo({ nombre: 'produccion', etiqueta: 'Producción' }),
        nodo({ nombre: 'despacho-pedidos', etiqueta: 'Despachos', icono: 'truck' }),
      ]);
    fixture.detectChanges();

    const modules = fixture.componentInstance['modules']();
    expect(modules.map((m: { title: string }) => m.title)).toEqual([
      'Producción',
      'Despachos',
      'Configuración',
    ]);
    expect(modules[1]).toEqual({
      icon: '/icons/module_despacho.svg',
      title: 'Despachos',
      description: '',
      routerLink: '/despacho-pedidos',
    });
  });

  it('shows the Insumos card when the API returns it, ordered between Inventario and Gestión Estratégica', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush([
      nodo({ nombre: 'estrategico', etiqueta: 'Gestión Estratégica' }),
      nodo({
        nombre: 'insumos',
        etiqueta: 'Insumos',
        descripcion: 'Gestión de insumos y su stock',
      }),
      nodo({ nombre: 'ventas', etiqueta: 'Ventas' }),
      nodo({ nombre: 'inventario', etiqueta: 'Inventario' }),
    ]);
    fixture.detectChanges();

    const modules = fixture.componentInstance['modules']();
    expect(modules.map((m: { title: string }) => m.title)).toEqual([
      'Ventas',
      'Inventario',
      'Insumos',
      'Gestión Estratégica',
    ]);
    expect(modules[2]).toEqual({
      icon: '/icons/module_insumos.svg',
      title: 'Insumos',
      description: 'Gestión de insumos y su stock',
      routerLink: '/insumos',
    });
  });

  it('shows only the Insumos card for a user whose menu has no Inventario', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush([nodo({ nombre: 'insumos', etiqueta: 'Insumos' })]);
    fixture.detectChanges();

    const modules = fixture.componentInstance['modules']();
    expect(modules).toHaveLength(1);
    expect(modules[0].title).toBe('Insumos');
    expect(modules[0].routerLink).toBe('/insumos');
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

  it('shows the empty state when the API returns only modules the front does not know', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush([nodo({ nombre: 'un-modulo-que-no-existe-en-el-front' })]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-home-cards').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain(
      'Aún no tienes módulos asignados. Contacta al administrador.',
    );
  });

  it('shows the error state with a retry button when the API call fails', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-home-cards').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar tus módulos.');
    const boton: HTMLButtonElement | null = fixture.nativeElement.querySelector('button');
    expect(boton?.textContent?.trim()).toBe('Reintentar');
  });

  it('retries /rutas/mi-menu when clicking Reintentar and then shows the cards', () => {
    const fixture = create();
    httpMock.expectOne(TREE_URL).flush('error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();
    httpMock
      .expectOne(TREE_URL)
      .flush([
        nodo({ nombre: 'ventas', etiqueta: 'Ventas' }),
        nodo({ nombre: 'inventario', etiqueta: 'Inventario' }),
      ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-home-cards').length).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain('No se pudieron cargar tus módulos.');
  });
});
