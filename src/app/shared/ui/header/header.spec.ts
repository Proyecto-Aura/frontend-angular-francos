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

  it('shows the avatar initials when there is no avatarUrl', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.componentRef.setInput('userName', 'Andres Chavarri');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('AC');
  });

  it('shows the real photo when avatarUrl is set', () => {
    const fixture = TestBed.createComponent(Header);
    fixture.componentRef.setInput('userName', 'Andres Chavarri');
    fixture.componentRef.setInput(
      'avatarUrl',
      'http://localhost:9000/francos-media/usuarios/a.png',
    );
    fixture.detectChanges();

    const img = (fixture.nativeElement as HTMLElement).querySelector('img');
    expect(img?.getAttribute('src')).toBe('http://localhost:9000/francos-media/usuarios/a.png');
  });
});
