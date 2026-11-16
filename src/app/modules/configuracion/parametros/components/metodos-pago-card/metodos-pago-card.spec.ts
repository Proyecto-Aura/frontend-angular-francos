import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MetodosPagoCard } from './metodos-pago-card';

describe('MetodosPagoCard', () => {
  let fixture: ComponentFixture<MetodosPagoCard>;
  let el: HTMLElement;

  const interruptor = (nombre: string) =>
    el.querySelector<HTMLInputElement>(`app-ds-switch[aria-label="${nombre}"] input`)!;

  function crear(culqi: boolean, efectivo: boolean, error: string | null = null) {
    fixture = TestBed.createComponent(MetodosPagoCard);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('culqi', culqi);
    fixture.componentRef.setInput('efectivo', efectivo);
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [MetodosPagoCard] }));

  it('muestra los dos métodos con su estado', () => {
    crear(true, false);

    expect(el.textContent).toContain('Culqi');
    expect(el.textContent).toContain('Efectivo');
    expect(interruptor('Pago con Culqi').checked).toBe(true);
    expect(interruptor('Pago en efectivo').checked).toBe(false);
  });

  it('emite cada cambio por separado', () => {
    crear(true, true);
    const culqi: boolean[] = [];
    const efectivo: boolean[] = [];
    fixture.componentInstance.culqiChange.subscribe((v) => culqi.push(v));
    fixture.componentInstance.efectivoChange.subscribe((v) => efectivo.push(v));

    interruptor('Pago con Culqi').click();
    interruptor('Pago en efectivo').click();

    expect(culqi).toEqual([false]);
    expect(efectivo).toEqual([false]);
  });

  it('muestra el error cuando no queda ningún método activo', () => {
    crear(false, false, 'Debe quedar al menos un método de pago activo');

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Debe quedar al menos un método de pago activo',
    );
  });

  it('no muestra alerta si no hay error', () => {
    crear(true, true);

    expect(el.querySelector('[role="alert"]')).toBeNull();
  });
});
