import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Input } from './input';

@Component({
  imports: [Input],
  template: `<label for="campo">Etiqueta</label><app-ds-input id="campo" />`,
})
class LabelHost {}

describe('Input', () => {
  function create() {
    return TestBed.createComponent(Input);
  }

  it('onInput updates the value model from the native event', () => {
    const fixture = create();
    fixture.detectChanges();
    const nativeInput = { value: 'hola' } as HTMLInputElement;

    fixture.componentInstance.onInput({ target: nativeInput } as unknown as Event);
    expect(fixture.componentInstance.value()).toBe('hola');
  });

  it('maps size to the right control height', () => {
    const fixture = create();
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    expect(fixture.componentInstance.height()).toBe('48px');
  });

  it('shellClasses reflects the invalid state', () => {
    const fixture = create();
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.shellClasses()).toContain('border-destructive');
  });

  it('forwards the id input onto the native input element', () => {
    const fixture = create();
    fixture.componentRef.setInput('id', 'auth-input-0');
    fixture.detectChanges();
    const native = fixture.nativeElement.querySelector('input');
    expect(native.id).toBe('auth-input-0');
  });

  it('lets a <label for> target the native control', () => {
    const fixture = TestBed.createComponent(LabelHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('#campo')).toHaveLength(1);
    expect(root.querySelector('label')?.control?.tagName).toBe('INPUT');
  });
});
