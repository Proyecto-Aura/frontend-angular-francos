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

  it('keeps the secondary text in normal weight by default', () => {
    const fixture = TestBed.createComponent(CellStack);
    fixture.componentRef.setInput('primary', 'FR-MV-002-261026-INS1');
    fixture.componentRef.setInput('secondary', 'FR-LT-002-261017-INS1');
    fixture.detectChanges();

    const secondaryEl = fixture.nativeElement.querySelectorAll('span')[2] as HTMLElement;
    expect(secondaryEl.classList.contains('font-semibold')).toBe(false);
  });

  it('bolds the secondary text when secondaryStrong is set (ej. codigo de movimiento + codigo de lote)', () => {
    const fixture = TestBed.createComponent(CellStack);
    fixture.componentRef.setInput('primary', 'FR-MV-002-261026-INS1');
    fixture.componentRef.setInput('secondary', 'FR-LT-002-261017-INS1');
    fixture.componentRef.setInput('secondaryStrong', true);
    fixture.detectChanges();

    const secondaryEl = fixture.nativeElement.querySelectorAll('span')[2] as HTMLElement;
    expect(secondaryEl.classList.contains('font-semibold')).toBe(true);
  });
});
