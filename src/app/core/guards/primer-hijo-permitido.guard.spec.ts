import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, UrlTree, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import {
  PrimerHijoPermitidoOpciones,
  primerHijoPermitidoGuard,
} from './primer-hijo-permitido.guard';
import { MenuService } from '../services/menu.service';
import { RutaNodo } from '../interfaces/ruta-nodo.interface';

function nodo(nombre: string, children: RutaNodo[] = []): RutaNodo {
  return {
    id: 1,
    nombre,
    etiqueta: nombre,
    icono: 'box',
    descripcion: null,
    estado: true,
    parent_id: null,
    children,
  };
}

describe('primerHijoPermitidoGuard', () => {
  // "base" son los segmentos de URL del padre de la ruta del guard (lo que
  // el guard lee de route.parent.pathFromRoot); "url" es state.url.
  function run(
    menuServiceStub: Partial<MenuService>,
    {
      nodoNombre = 'modulo',
      opciones,
      base = ['modulo'],
      url = '/modulo',
    }: {
      nodoNombre?: string;
      opciones?: PrimerHijoPermitidoOpciones;
      base?: string[];
      url?: string;
    } = {},
  ) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: MenuService, useValue: menuServiceStub }],
    });
    const router = TestBed.inject(Router);

    const pathFromRoot = [{ url: [] }, ...base.map((path) => ({ url: [{ path }] }))];
    const route = { parent: { pathFromRoot } } as never;
    const state = { url } as never;
    const result$ = TestBed.runInInjectionContext(() =>
      primerHijoPermitidoGuard(nodoNombre, opciones)(route, state),
    ) as Observable<UrlTree>;
    return { result$, router };
  }

  async function destinoDe(ejecucion: ReturnType<typeof run>): Promise<string> {
    const result = await firstValueFrom(ejecucion.result$);
    return ejecucion.router.serializeUrl(result);
  }

  const MODULO_AB = [nodo('modulo', [nodo('pagina-a'), nodo('pagina-b')])];

  it('redirects to the preferred leaf when it is allowed', async () => {
    const ejecucion = run(
      { getTree: () => of(MODULO_AB) },
      { opciones: { preferido: 'pagina-b' } },
    );
    expect(await destinoDe(ejecucion)).toBe('/modulo/pagina-b');
  });

  it('redirects to the first allowed leaf when the preferred one is not in the menu', async () => {
    const ejecucion = run(
      { getTree: () => of(MODULO_AB) },
      { opciones: { preferido: 'pagina-no-permitida' } },
    );
    expect(await destinoDe(ejecucion)).toBe('/modulo/pagina-a');
  });

  it('redirects to the first allowed leaf when no preferred option is given', async () => {
    const ejecucion = run({ getTree: () => of(MODULO_AB) });
    expect(await destinoDe(ejecucion)).toBe('/modulo/pagina-a');
  });

  it('redirects to the fallback page when the role has no leaves', async () => {
    const ejecucion = run(
      { getTree: () => of([nodo('configuracion')]) },
      {
        nodoNombre: 'configuracion',
        opciones: { preferido: 'empresa', fallback: 'perfil' },
        base: ['configuracion'],
        url: '/configuracion',
      },
    );
    expect(await destinoDe(ejecucion)).toBe('/configuracion/perfil');
  });

  it('redirects to /home when there are no leaves and no fallback', async () => {
    const ejecucion = run(
      { getTree: () => of([nodo('modulo')]) },
      { opciones: { preferido: 'pagina-a' } },
    );
    expect(await destinoDe(ejecucion)).toBe('/home');
  });

  it('redirects to /home when the node does not exist in the tree', async () => {
    const ejecucion = run(
      { getTree: () => of([nodo('otro-modulo', [nodo('pagina-x')])]) },
      { opciones: { preferido: 'pagina-a' } },
    );
    expect(await destinoDe(ejecucion)).toBe('/home');
  });

  it('redirects to /auth when the menu tree request fails', async () => {
    const ejecucion = run({ getTree: () => throwError(() => new Error('network')) });
    expect(await destinoDe(ejecucion)).toBe('/auth');
  });

  it('redirects to /home instead of looping when the target equals the requested URL', async () => {
    const ejecucion = run(
      { getTree: () => of([nodo('modulo', [nodo('pagina-a')])]) },
      { url: '/modulo/pagina-a' },
    );
    expect(await destinoDe(ejecucion)).toBe('/home');
  });

  it('ignores query string and fragment when comparing with the requested URL', async () => {
    const ejecucion = run(
      { getTree: () => of([nodo('modulo', [nodo('pagina-a')])]) },
      { url: '/modulo/pagina-a?x=1#y' },
    );
    expect(await destinoDe(ejecucion)).toBe('/home');
  });

  it('builds the target under the parent segments of a nested group', async () => {
    const tree = [
      nodo('ventas', [nodo('clientes'), nodo('catalogo', [nodo('gestion-productos')])]),
    ];
    const ejecucion = run(
      { getTree: () => of(tree) },
      {
        nodoNombre: 'catalogo',
        opciones: { preferido: 'gestion-productos' },
        base: ['ventas', 'catalogo'],
        url: '/ventas/catalogo',
      },
    );
    expect(await destinoDe(ejecucion)).toBe('/ventas/catalogo/gestion-productos');
  });

  it('supports nested leaf paths', async () => {
    const tree = [nodo('modulo', [nodo('g', [nodo('x'), nodo('y')]), nodo('z')])];
    const ejecucion = run({ getTree: () => of(tree) });
    expect(await destinoDe(ejecucion)).toBe('/modulo/g/x');
  });
});

@Component({ selector: 'app-stub-home', template: 'home' })
class StubHome {}

@Component({ selector: 'app-stub-a', template: 'pagina-a' })
class StubA {}

@Component({ selector: 'app-stub-b', template: 'pagina-b' })
class StubB {}

describe('primerHijoPermitidoGuard with the real router', () => {
  // Mismo patron que las rutas reales de cada modulo: paginas + '' / '**'
  // solo-guard con children: [].
  function rutasDeModulo(nodoNombre: string): Routes {
    const guard = primerHijoPermitidoGuard(nodoNombre, { preferido: 'pagina-a' });
    return [
      { path: 'pagina-a', component: StubA },
      { path: 'pagina-b', component: StubB },
      { path: '', pathMatch: 'full', canActivate: [guard], children: [] },
      { path: '**', canActivate: [guard], children: [] },
    ];
  }

  const ROUTES: Routes = [
    { path: 'home', component: StubHome },
    { path: 'modulo', children: rutasDeModulo('modulo') },
    {
      path: 'ventas',
      children: [
        // Grupo cargado con loadChildren, igual que catalogo/negocio/ti.
        { path: 'catalogo', loadChildren: () => Promise.resolve(rutasDeModulo('catalogo')) },
      ],
    },
  ];

  async function navegar(tree: RutaNodo[], url: string): Promise<string> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(ROUTES),
        { provide: MenuService, useValue: { getTree: () => of(tree) } },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  it('navigating to the module root lands on the preferred page', async () => {
    const tree = [nodo('modulo', [nodo('pagina-b'), nodo('pagina-a')])];
    expect(await navegar(tree, '/modulo')).toBe('/modulo/pagina-a');
  });

  it('navigating to the module root lands on the first allowed page when the preferred one is not allowed', async () => {
    const tree = [nodo('modulo', [nodo('pagina-b')])];
    expect(await navegar(tree, '/modulo')).toBe('/modulo/pagina-b');
  });

  it('an unknown URL inside the module redirects to the allowed page', async () => {
    const tree = [nodo('modulo', [nodo('pagina-b')])];
    expect(await navegar(tree, '/modulo/inexistente')).toBe('/modulo/pagina-b');
  });

  it('a module with no allowed pages redirects to /home', async () => {
    const tree = [nodo('modulo')];
    expect(await navegar(tree, '/modulo')).toBe('/home');
  });

  it('redirects correctly inside a lazy-loaded group', async () => {
    const tree = [nodo('ventas', [nodo('catalogo', [nodo('pagina-b')])])];
    expect(await navegar(tree, '/ventas/catalogo')).toBe('/ventas/catalogo/pagina-b');
  });

  it('does not loop when the menu points to a page the router does not have', async () => {
    const tree = [nodo('modulo', [nodo('pagina-fantasma')])];
    expect(await navegar(tree, '/modulo')).toBe('/home');
  });
});
