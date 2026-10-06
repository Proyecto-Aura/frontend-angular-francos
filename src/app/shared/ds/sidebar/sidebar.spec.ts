import { TestBed } from '@angular/core/testing';
import { DsSidebar, DsSidebarItem } from './sidebar';

describe('DsSidebar', () => {
  function create() {
    return TestBed.createComponent(DsSidebar);
  }

  it('isExpanded/toggleExpanded track which parent items are open', () => {
    const fixture = create();
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.isExpanded('catalogo')).toBe(false);
    component.toggleExpanded('catalogo');
    expect(component.isExpanded('catalogo')).toBe(true);
    component.toggleExpanded('catalogo');
    expect(component.isExpanded('catalogo')).toBe(false);
  });

  it('onItemClick expands items that have children instead of navigating', () => {
    const fixture = create();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const emitted: string[] = [];
    component.navigate.subscribe((id) => emitted.push(id));

    const parent: DsSidebarItem = {
      id: 'catalogo',
      label: 'Catálogo',
      children: [{ id: 'productos', label: 'Productos' }],
    };
    component.onItemClick(parent);

    expect(component.isExpanded('catalogo')).toBe(true);
    expect(emitted).toEqual([]);
  });

  it('onItemClick emits navigate for leaf items', () => {
    const fixture = create();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const emitted: string[] = [];
    component.navigate.subscribe((id) => emitted.push(id));

    component.onItemClick({ id: 'inventario', label: 'Inventario' });
    expect(emitted).toEqual(['inventario']);
  });
});
