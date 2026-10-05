import { TestBed } from '@angular/core/testing';
import { AuthReset } from './auth-reset';

describe('AuthReset', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(AuthReset);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
