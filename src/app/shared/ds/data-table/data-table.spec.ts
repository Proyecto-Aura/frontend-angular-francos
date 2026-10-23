import { TestBed } from '@angular/core/testing';
import { DataTable } from './data-table';

describe('DataTable', () => {
  function create() {
    const fixture = TestBed.createComponent(DataTable);
    fixture.componentRef.setInput('columns', [
      { key: 'name', header: 'Nombre' },
      { key: 'email', header: 'Email' },
    ]);
    return fixture;
  }

  it('colSpan is columns.length when not selectable', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.colSpan()).toBe(2);
  });

  it('colSpan adds 1 extra column when selectable', () => {
    const fixture = create();
    fixture.componentRef.setInput('selectable', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.colSpan()).toBe(3);
  });

  it('cellValue reads the given key off the row', () => {
    const fixture = create();
    fixture.detectChanges();
    expect(fixture.componentInstance.cellValue({ name: 'Juan' }, 'name')).toBe('Juan');
  });

  it('onRowClick emits the row and index', () => {
    const fixture = create();
    fixture.detectChanges();
    const emitted: { row: unknown; index: number }[] = [];
    fixture.componentInstance.rowClicked.subscribe((e) => emitted.push(e));

    fixture.componentInstance.onRowClick({ name: 'Juan' }, 2);
    expect(emitted).toEqual([{ row: { name: 'Juan' }, index: 2 }]);
  });
});
