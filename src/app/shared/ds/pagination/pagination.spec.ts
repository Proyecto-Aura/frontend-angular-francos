import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

describe('Pagination', () => {
  function create() {
    return TestBed.createComponent(Pagination);
  }

  it('summary falls back to "Página X de Y" without total/pageSize', () => {
    const fixture = create();
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageCount', 5);
    fixture.detectChanges();
    expect(fixture.componentInstance.summary()).toBe('Página 2 de 5');
  });

  it('summary shows the "Mostrando X-Y de Z" form when total/pageSize are set', () => {
    const fixture = create();
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('total', 95);
    fixture.componentRef.setInput('pageSize', 20);
    fixture.detectChanges();
    expect(fixture.componentInstance.summary()).toBe('Mostrando 21-40 de 95');
  });

  it('pageList lists every page when pageCount is small (<=7)', () => {
    const fixture = create();
    fixture.componentRef.setInput('pageCount', 5);
    fixture.detectChanges();
    expect(fixture.componentInstance.pageList()).toEqual([1, 2, 3, 4, 5]);
  });

  it('pageList truncates with an ellipsis when pageCount is large', () => {
    const fixture = create();
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageCount', 20);
    fixture.detectChanges();
    const list = fixture.componentInstance.pageList();
    expect(list[list.length - 2]).toBe('…');
    expect(list[list.length - 1]).toBe(20);
  });

  it('goTo emits the requested page', () => {
    const fixture = create();
    fixture.detectChanges();
    const emitted: number[] = [];
    fixture.componentInstance.changed.subscribe((p) => emitted.push(p));

    fixture.componentInstance.goTo(3);
    expect(emitted).toEqual([3]);
  });
});
