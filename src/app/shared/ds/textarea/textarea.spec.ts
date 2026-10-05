import { TestBed } from '@angular/core/testing';
import { Textarea } from './textarea';

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
});
