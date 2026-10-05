import { TestBed } from '@angular/core/testing';
import { DropdownMenu, DropdownMenuItem } from './dropdown-menu';

describe('DropdownMenu', () => {
  function create() {
    const fixture = TestBed.createComponent(DropdownMenu);
    fixture.detectChanges();
    return fixture;
  }

  it('starts closed and toggle() opens/closes it', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    expect(component.open()).toBe(false);
    component.toggle();
    expect(component.open()).toBe(true);
    component.toggle();
    expect(component.open()).toBe(false);
  });

  it('select() closes the menu and calls the item onSelect callback', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const onSelect = vi.fn();
    const item: DropdownMenuItem = { label: 'Editar', onSelect };

    component.toggle();
    component.select(item);

    expect(component.open()).toBe(false);
    expect(onSelect).toHaveBeenCalled();
  });

  it('a click outside the host closes the menu', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.toggle();
    expect(component.open()).toBe(true);

    const outsideTarget = document.createElement('div');
    document.body.appendChild(outsideTarget);
    component.onDocMouseDown({ target: outsideTarget } as unknown as MouseEvent);
    expect(component.open()).toBe(false);

    document.body.removeChild(outsideTarget);
  });
});
