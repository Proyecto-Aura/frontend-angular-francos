import { TestBed } from '@angular/core/testing';
import { CanalEmailCard } from './canal-email-card';

describe('CanalEmailCard', () => {
  function crear(
    inputs: Partial<{
      activo: boolean;
      remitente: string;
      servidorSmtp: string;
      seguridad: string;
    }> = {},
  ) {
    const fixture = TestBed.createComponent(CanalEmailCard);
    fixture.componentRef.setInput('activo', inputs.activo ?? true);
    fixture.componentRef.setInput('remitente', inputs.remitente ?? 'no-reply@francos.pe');
    fixture.componentRef.setInput('servidorSmtp', inputs.servidorSmtp ?? 'smtp.francos.pe:587');
    fixture.componentRef.setInput('seguridad', inputs.seguridad ?? 'STARTTLS');
    fixture.detectChanges();
    return fixture;
  }

  it('muestra remitente, servidor y seguridad', () => {
    const fixture = crear();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Email (SMTP)');
    expect(texto).toContain('no-reply@francos.pe');
    expect(texto).toContain('smtp.francos.pe:587');
    expect(texto).toContain('STARTTLS');
  });

  it('muestra "—" para los campos vacíos', () => {
    const fixture = crear({ remitente: '', servidorSmtp: '', seguridad: '' });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('—');
  });

  it('emite activoChange al mover el switch', () => {
    const fixture = crear({ activo: false });
    let emitido: boolean | undefined;
    fixture.componentInstance.activoChange.subscribe((v) => (emitido = v));

    fixture.nativeElement.querySelector('input[type="checkbox"]').click();

    expect(emitido).toBe(true);
  });
  it('asocia un nombre accesible al interruptor nativo', () => {
    const fixture = crear();
    const control = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    expect(control.labels?.[0]?.textContent).toContain('Canal de email activo');
  });
});
