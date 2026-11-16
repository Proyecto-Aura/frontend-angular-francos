import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { permisoGuard } from './permiso.guard';
import { MenuService } from '../services/menu.service';
import { RutaNodo } from '../interfaces/ruta-nodo.interface';

// Menu de un usuario con rol "insumos": Insumos es modulo de primer nivel
// con sus paginas como hijos directos (ya no cuelga de Inventario).
const TREE: RutaNodo[] = [
  {
    id: 1,
    nombre: 'insumos',
    etiqueta: 'Insumos',
    icono: 'box',
    descripcion: 'Gestión de insumos y su stock',
    estado: true,
    parent_id: null,
    children: [
      {
        id: 2,
        nombre: 'stock-insumos',
        etiqueta: 'Stock',
        icono: 'boxes',
        descripcion: null,
        estado: true,
        parent_id: 1,
        children: [],
      },
      {
        id: 3,
        nombre: 'solicitudes-insumos',
        etiqueta: 'Solicitudes',
        icono: 'boxes',
        descripcion: null,
        estado: true,
        parent_id: 1,
        children: [],
      },
    ],
  },
];

describe('permisoGuard', () => {
  function run(path: string | undefined, menuServiceStub: Partial<MenuService>) {
    const urlTree = { fake: 'url-tree' };
    const router = { createUrlTree: vi.fn().mockReturnValue(urlTree) };
    TestBed.configureTestingModule({
      providers: [
        { provide: MenuService, useValue: menuServiceStub },
        { provide: Router, useValue: router },
      ],
    });

    const route = { routeConfig: { path } } as never;
    const result$ = TestBed.runInInjectionContext(() => permisoGuard(route, {} as never));
    return { result$, router, urlTree };
  }

  it('allows navigation when the route path is permitted in the menu tree', async () => {
    const { result$ } = run('stock-insumos', { getTree: () => of(TREE) });
    const result = await toPromise(result$);
    expect(result).toBe(true);
  });

  it('allows every page of the insumos module', async () => {
    const { result$ } = run('solicitudes-insumos', { getTree: () => of(TREE) });
    const result = await toPromise(result$);
    expect(result).toBe(true);
  });

  it('redirects to /home when the route path is not in the menu tree', async () => {
    const { result$, router, urlTree } = run('stock-productos', { getTree: () => of(TREE) });
    const result = await toPromise(result$);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/home']);
    expect(result).toBe(urlTree);
  });

  it('redirects to /auth when fetching the menu fails', async () => {
    const { result$, router, urlTree } = run('stock-insumos', {
      getTree: () => throwError(() => new Error('network')),
    });
    const result = await toPromise(result$);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth']);
    expect(result).toBe(urlTree);
  });

  it('allows navigation when the matched route has no path to check', async () => {
    const { result$ } = run(undefined, { getTree: () => of(TREE) });
    const result = await toPromise(result$);
    expect(result).toBe(true);
  });
});

function toPromise<T>(value: T | import('rxjs').Observable<T>): Promise<T> {
  if (value && typeof (value as never)['subscribe'] === 'function') {
    return new Promise((resolve) => (value as import('rxjs').Observable<T>).subscribe(resolve));
  }
  return Promise.resolve(value as T);
}
