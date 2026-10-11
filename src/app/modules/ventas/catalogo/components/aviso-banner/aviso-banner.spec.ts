import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvisoBanner } from './aviso-banner';

describe('AvisoBanner', () => {
  let fixture: ComponentFixture<AvisoBanner>;

  function crear(texto: string, tono?: 'ok' | 'error'): HTMLElement {
    fixture = TestBed.createComponent(AvisoBanner);
    fixture.componentRef.setInput('texto', texto);
    if (tono) fixture.componentRef.setInput('tono', tono);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows nothing without text', () => {
    expect(crear('').querySelector('p')).toBeNull();
  });

  it('shows a success notice by default', () => {
    const el = crear('Producto registrado');

    expect(el.querySelector('p')?.textContent).toContain('Producto registrado');
    expect(el.querySelector('[role="status"]')).not.toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('announces an error notice as an alert', () => {
    const el = crear('No se pudo guardar', 'error');

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.querySelector('.text-destructive')).not.toBeNull();
  });

  it('emits closed from the close button', () => {
    const el = crear('Aviso');
    let cerrado = 0;
    fixture.componentInstance.closed.subscribe(() => cerrado++);

    (el.querySelector('button[aria-label="Cerrar aviso"]') as HTMLButtonElement).click();

    expect(cerrado).toBe(1);
  });
});
