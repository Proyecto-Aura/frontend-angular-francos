import { TestBed } from '@angular/core/testing';
import { CanalPortalCard } from './canal-portal-card';

describe('CanalPortalCard', () => {
  function crear(inputs: Partial<{ activo: boolean; destinatarios: string }> = {}) {
    const fixture = TestBed.createComponent(CanalPortalCard);
    fixture.componentRef.setInput('activo', inputs.activo ?? true);
    fixture.componentRef.setInput('destinatarios', inputs.destinatarios ?? 'Clientes del Portal B');
    fixture.detectChanges();
    return fixture;
  }

  it('muestra los destinatarios', () => {
    const fixture = crear();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Clientes del Portal B');
  });

  it('muestra "—" si no hay destinatarios', () => {
    const fixture = crear({ destinatarios: '' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('—');
  });

  it('emite activoChange al mover el switch', () => {
    const fixture = crear({ activo: true });
    let emitido: boolean | undefined;
    fixture.componentInstance.activoChange.subscribe((v) => (emitido = v));

    fixture.nativeElement.querySelector('input[type="checkbox"]').click();

    expect(emitido).toBe(false);
  });
  it('asocia un nombre accesible al interruptor nativo', () => {
    const fixture = crear();
    const control = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    expect(control.labels?.[0]?.textContent).toContain('Canal del portal activo');
  });
});
