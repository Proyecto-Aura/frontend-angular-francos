import { TestBed } from '@angular/core/testing';
import { Field } from './field';

describe('Field', () => {
  it('renders the label and hint when there is no error', () => {
    const fixture = TestBed.createComponent(Field);
    fixture.componentRef.setInput('label', 'Correo');
    fixture.componentRef.setInput('hint', 'Usa tu correo corporativo');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Correo');
    expect(text).toContain('Usa tu correo corporativo');
  });

  it('shows the error instead of the hint when both are set (error takes priority)', () => {
    const fixture = TestBed.createComponent(Field);
    fixture.componentRef.setInput('hint', 'Usa tu correo corporativo');
    fixture.componentRef.setInput('error', 'Correo inválido');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Correo inválido');
    expect(text).not.toContain('Usa tu correo corporativo');
  });
});
