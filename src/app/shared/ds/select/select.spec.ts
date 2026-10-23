import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Select } from './select';

@Component({
  imports: [Select],
  template: `<label for="campo">Etiqueta</label><app-ds-select id="campo" />`,
})
class LabelHost {}

describe('Select', () => {
  function create() {
    return TestBed.createComponent(Select);
  }

  it('onChange updates the value model from the native event', () => {
    const fixture = create();
    fixture.detectChanges();
    const native = { value: 'lima' } as HTMLSelectElement;

    fixture.componentInstance.onChange({ target: native } as unknown as Event);
    expect(fixture.componentInstance.value()).toBe('lima');
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

  it('lets a <label for> target the native control', () => {
    const fixture = TestBed.createComponent(LabelHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('#campo')).toHaveLength(1);
    expect(root.querySelector('label')?.control?.tagName).toBe('SELECT');
  });
});
