import { TestBed } from '@angular/core/testing';
import { CellStack } from './cell-stack';

describe('CellStack', () => {
  it('renders the primary and secondary text', () => {
    const fixture = TestBed.createComponent(CellStack);
    fixture.componentRef.setInput('primary', 'Juan Perez');
    fixture.componentRef.setInput('secondary', 'juan@francos.com');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Juan Perez');
    expect(text).toContain('juan@francos.com');
  });
});
