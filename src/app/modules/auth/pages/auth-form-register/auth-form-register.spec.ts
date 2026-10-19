import { TestBed } from '@angular/core/testing';
import { AuthFormRegister } from './auth-form-register';

describe('AuthFormRegister', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(AuthFormRegister);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
