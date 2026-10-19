import { TestBed } from '@angular/core/testing';
import { Breadcrumb } from './breadcrumb';

describe('Breadcrumb', () => {
  it('renders one entry per item and emits itemClick when clicked', () => {
    const fixture = TestBed.createComponent(Breadcrumb);
    const items = [{ label: 'Inicio', href: '/' }, { label: 'Ventas' }];
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const emitted: unknown[] = [];
    fixture.componentInstance.itemClick.subscribe((item) => emitted.push(item));

    fixture.componentInstance.itemClick.emit(items[0]);
    expect(emitted).toEqual([items[0]]);
  });
});
