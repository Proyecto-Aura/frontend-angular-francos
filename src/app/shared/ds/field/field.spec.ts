import { TestBed } from '@angular/core/testing';
import { Field } from './field';

describe('Field', () => {
  it('renders the label, hint and error text passed in', () => {
    const fixture = TestBed.createComponent(Field);
    fixture.componentRef.setInput('label', 'Correo');
    fixture.componentRef.setInput('hint', 'Usa tu correo corporativo');
    fixture.componentRef.setInput('error', 'Correo inválido');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Correo');
    expect(text).toContain('Usa tu correo corporativo');
    expect(text).toContain('Correo inválido');
  });
});
