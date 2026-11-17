import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Alert, AlertTone } from './alert';

describe('Alert', () => {
  let fixture: ComponentFixture<Alert>;

  function crear(
    overrides: { tone?: AlertTone; description?: string; linkLabel?: string; closable?: boolean } = {},
  ): HTMLElement {
    fixture = TestBed.createComponent(Alert);
    fixture.componentRef.setInput('title', 'Mensaje');
    if (overrides.tone) fixture.componentRef.setInput('tone', overrides.tone);
    if (overrides.description) fixture.componentRef.setInput('description', overrides.description);
    if (overrides.linkLabel) fixture.componentRef.setInput('linkLabel', overrides.linkLabel);
    if (overrides.closable !== undefined) fixture.componentRef.setInput('closable', overrides.closable);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra el título y, por defecto, el tono "info" con rol "status"', () => {
    const el = crear();

    expect(el.textContent).toContain('Mensaje');
    expect(el.textContent).toContain('Información');
    expect(el.querySelector('[role="status"]')).not.toBeNull();
  });

  it('un error se anuncia como "alert" y con su propia etiqueta', () => {
    const el = crear({ tone: 'error' });

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).toContain('Error');
  });

  it('muestra la descripción solo si se la pasan', () => {
    expect(crear().textContent).not.toContain('Descripción');
    expect(crear({ description: 'Descripción de prueba' }).textContent).toContain(
      'Descripción de prueba',
    );
  });

  it('muestra el enlace de seguimiento solo si se lo pasan, y emite linkClick al hacer clic', () => {
    const sinEnlace = crear();
    expect(sinEnlace.querySelector('button')?.textContent ?? '').not.toContain('Ver seguimiento');

    const el = crear({ linkLabel: 'Ver seguimiento' });
    let clics = 0;
    fixture.componentInstance.linkClick.subscribe(() => clics++);

    const enlace = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ver seguimiento'),
    )!;
    enlace.click();

    expect(clics).toBe(1);
  });

  it('el botón de cerrar aparece por defecto y emite closed; se puede ocultar con closable=false', () => {
    const el = crear();
    let cerrados = 0;
    fixture.componentInstance.closed.subscribe(() => cerrados++);

    (el.querySelector('button[aria-label="Cerrar alerta"]') as HTMLButtonElement).click();
    expect(cerrados).toBe(1);

    const sinCerrar = crear({ closable: false });
    expect(sinCerrar.querySelector('button[aria-label="Cerrar alerta"]')).toBeNull();
  });
});
