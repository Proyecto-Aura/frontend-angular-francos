import { TestBed } from '@angular/core/testing';
import { SelectOption } from '../select/select';
import { Combobox } from './combobox';

const OPTIONS: SelectOption[] = [
  { value: '1', label: 'Harina de trigo' },
  { value: '2', label: 'Cajas de empaque' },
  { value: '3', label: 'Azúcar blanca' },
];

describe('Combobox', () => {
  function create() {
    const fixture = TestBed.createComponent(Combobox);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the selected option label when closed', () => {
    const fixture = create();
    fixture.componentRef.setInput('value', '2');
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedLabel()).toBe('Cajas de empaque');
    expect(fixture.componentInstance.displayText()).toBe('Cajas de empaque');
  });

  it('abrir() opens the list and clears the filter so every option shows', () => {
    const fixture = create();

    fixture.componentInstance.abrir();

    expect(fixture.componentInstance.open()).toBe(true);
    expect(fixture.componentInstance.filteredOptions()).toEqual(OPTIONS);
  });

  it('does not open when disabled', () => {
    const fixture = create();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    fixture.componentInstance.abrir();

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('filters the options by the typed text, case-insensitively', () => {
    const fixture = create();
    fixture.componentInstance.abrir();

    fixture.componentInstance.onInput({ target: { value: 'harina' } } as unknown as Event);

    expect(fixture.componentInstance.filteredOptions()).toEqual([OPTIONS[0]]);
  });

  it('seleccionar() sets the value and closes the list', () => {
    const fixture = create();
    fixture.componentInstance.abrir();

    fixture.componentInstance.seleccionar(OPTIONS[1]);

    expect(fixture.componentInstance.value()).toBe('2');
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('a click outside the host closes the list without changing the value', () => {
    const fixture = create();
    fixture.componentInstance.abrir();

    const outsideTarget = document.createElement('div');
    document.body.appendChild(outsideTarget);
    fixture.componentInstance.onDocMouseDown({ target: outsideTarget } as unknown as MouseEvent);

    expect(fixture.componentInstance.open()).toBe(false);
    expect(fixture.componentInstance.value()).toBe('');

    document.body.removeChild(outsideTarget);
  });

  it('ArrowDown opens the list when closed, then cycles the highlighted index', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    const arrowDown = { key: 'ArrowDown', preventDefault: vi.fn() } as unknown as KeyboardEvent;

    component.onKeydown(arrowDown);
    expect(component.open()).toBe(true);
    expect(component.highlightIndex()).toBe(-1);

    component.onKeydown(arrowDown);
    expect(component.highlightIndex()).toBe(0);
    component.onKeydown(arrowDown);
    expect(component.highlightIndex()).toBe(1);
  });

  it('ArrowUp wraps around to the last option', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.abrir();

    component.onKeydown({ key: 'ArrowUp', preventDefault: vi.fn() } as unknown as KeyboardEvent);

    expect(component.highlightIndex()).toBe(OPTIONS.length - 1);
  });

  it('Enter selects the highlighted option', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.abrir();
    component.highlightIndex.set(1);

    component.onKeydown({ key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent);

    expect(component.value()).toBe('2');
    expect(component.open()).toBe(false);
  });

  it('Enter without a highlighted option does nothing', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.abrir();

    component.onKeydown({ key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent);

    expect(component.value()).toBe('');
    expect(component.open()).toBe(true);
  });

  it('Escape closes the list', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.abrir();

    component.onKeydown({ key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent);

    expect(component.open()).toBe(false);
  });

  it('shows the empty message when no option matches the filter', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.abrir();

    component.onInput({ target: { value: 'no existe' } } as unknown as Event);

    expect(component.filteredOptions()).toEqual([]);
  });

  it('maps size to the right control height', () => {
    const fixture = create();
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    expect(fixture.componentInstance.height()).toBe('36px');
  });

  it('shellClasses reflects the invalid state', () => {
    const fixture = create();
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.shellClasses()).toContain('border-destructive');
  });
});
