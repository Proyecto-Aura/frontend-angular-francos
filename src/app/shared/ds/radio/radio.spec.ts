import { TestBed } from '@angular/core/testing';
import { Radio } from './radio';

describe('Radio', () => {
  it('renders the label and reflects the checked input on the native radio', () => {
    const fixture = TestBed.createComponent(Radio);
    fixture.componentRef.setInput('label', 'Sede Central');
    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sede Central');
    const native = fixture.nativeElement.querySelector('input[type="radio"]');
    expect(native?.checked).toBe(true);
  });
});
