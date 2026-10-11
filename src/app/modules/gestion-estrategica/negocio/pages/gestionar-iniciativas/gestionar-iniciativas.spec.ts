import { TestBed } from '@angular/core/testing';
import { GestionarIniciativas } from './gestionar-iniciativas';

describe('GestionarIniciativas', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(GestionarIniciativas);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
