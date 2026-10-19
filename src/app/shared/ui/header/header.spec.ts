import { TestBed } from '@angular/core/testing';
import { Header } from './header';

describe('Header', () => {
  it('renders the userName and userRole inputs', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.componentRef.setInput('userName', 'Andres Chavarri');
    fixture.componentRef.setInput('userRole', 'Administrador');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Andres Chavarri');
    expect(text).toContain('Administrador');
  });
});
