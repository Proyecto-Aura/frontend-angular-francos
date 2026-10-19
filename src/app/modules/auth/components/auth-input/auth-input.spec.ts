import { TestBed } from '@angular/core/testing';
import { AuthInput } from './auth-input';

describe('AuthInput', () => {
  function create() {
    const fixture = TestBed.createComponent(AuthInput);
    fixture.detectChanges();
    return fixture;
  }

  it('creates', () => {
    const fixture = create();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts with the password hidden and toggles it on togglePasswordVisible()', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    expect(component.passwordVisible()).toBe(false);
    component.togglePasswordVisible();
    expect(component.passwordVisible()).toBe(true);
    component.togglePasswordVisible();
    expect(component.passwordVisible()).toBe(false);
  });

  it('gives each instance a distinct inputId', () => {
    const a = create().componentInstance as unknown as Record<string, string>;
    const b = create().componentInstance as unknown as Record<string, string>;
    expect(a['inputId']).not.toBe(b['inputId']);
  });

  it('renders the label text passed via the label input', () => {
    const fixture = create();
    fixture.componentRef.setInput('label', 'Usuario');
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label');
    expect(label?.textContent?.trim()).toBe('Usuario');
  });
});
