import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Textarea } from './textarea';

@Component({
  imports: [Textarea],
  template: `<label for="campo">Etiqueta</label><app-ds-textarea id="campo" />`,
})
class LabelHost {}

describe('Textarea', () => {
  it('onInput updates the value model from the native event', () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.detectChanges();
    const native = { value: 'notas' } as HTMLTextAreaElement;

    fixture.componentInstance.onInput({ target: native } as unknown as Event);
    expect(fixture.componentInstance.value()).toBe('notas');
  });

  it('classes reflects the invalid state', () => {
    const fixture = TestBed.createComponent(Textarea);
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    expect(fixture.componentInstance.classes()).toContain('border-destructive');
  });

  it('lets a <label for> target the native control', () => {
    const fixture = TestBed.createComponent(LabelHost);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('#campo')).toHaveLength(1);
    expect(root.querySelector('label')?.control?.tagName).toBe('TEXTAREA');
  });
});
