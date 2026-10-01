import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ModuleLayout } from './module-layout';
import { SidebarLink } from '../../shared/ui/sidebar/sidebar';

describe('ModuleLayout', () => {
  function createWithLinks(sidebarLinks: SidebarLink[] | undefined) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { sidebarLinks } } } },
      ],
    });
    const fixture = TestBed.createComponent(ModuleLayout);
    fixture.detectChanges();
    return fixture;
  }

  it('reads links from the route data', () => {
    const links: SidebarLink[] = [{ label: 'Clientes', path: '/ventas/clientes' }];
    const fixture = createWithLinks(links);
    expect(fixture.componentInstance.links).toEqual(links);
  });

  it('falls back to an empty array when the route has no sidebarLinks', () => {
    const fixture = createWithLinks(undefined);
    expect(fixture.componentInstance.links).toEqual([]);
  });
});
