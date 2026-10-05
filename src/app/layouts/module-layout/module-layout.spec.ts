import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ModuleLayout } from './module-layout';
import { SidebarLink } from '../../shared/ui/sidebar/sidebar';

describe('ModuleLayout', () => {
  function createWithData(data: { sidebarLinks?: SidebarLink[]; sidebarTitle?: string }) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data } } },
      ],
    });
    const fixture = TestBed.createComponent(ModuleLayout);
    fixture.detectChanges();
    return fixture;
  }

  it('reads links from the route data', () => {
    const links: SidebarLink[] = [{ label: 'Clientes', path: '/ventas/clientes' }];
    const fixture = createWithData({ sidebarLinks: links });
    expect(fixture.componentInstance.links).toEqual(links);
  });

  it('falls back to an empty array when the route has no sidebarLinks', () => {
    const fixture = createWithData({});
    expect(fixture.componentInstance.links).toEqual([]);
  });

  it('reads sectionLabel from sidebarTitle in the route data', () => {
    const fixture = createWithData({ sidebarTitle: 'Gestión de Ventas' });
    expect(fixture.componentInstance.sectionLabel).toBe('Gestión de Ventas');
  });

  it('falls back to null when the route has no sidebarTitle', () => {
    const fixture = createWithData({});
    expect(fixture.componentInstance.sectionLabel).toBeNull();
  });
});
