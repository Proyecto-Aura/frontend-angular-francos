import { TestBed } from '@angular/core/testing';
import { GestionEstrategicaTi } from './gestion-estrategica-ti';

describe('GestionEstrategicaTi', () => {
  it('creates', () => {
    const fixture = TestBed.createComponent(GestionEstrategicaTi);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
