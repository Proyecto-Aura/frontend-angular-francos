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

  it('bolds a column marked strong (ej. un codigo que funciona como identificador de la fila)', () => {
    const fixture = TestBed.createComponent(DataTable);
    fixture.componentRef.setInput('columns', [
      { key: 'codigoLote', header: 'Lote', strong: true },
      { key: 'estado', header: 'Estado' },
    ]);
    fixture.componentRef.setInput('rows', [
      { codigoLote: 'FR-LT-001-261026-INS242', estado: 'vencido' },
    ]);
    fixture.detectChanges();

    const celdas = fixture.nativeElement.querySelectorAll('tbody td') as NodeListOf<HTMLElement>;
    expect(celdas[0].classList.contains('font-semibold')).toBe(true);
    expect(celdas[1].classList.contains('font-semibold')).toBe(false);
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
