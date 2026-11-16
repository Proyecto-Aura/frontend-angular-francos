import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PromocionesCard } from './promociones-card';

const PROMOCIONES = `${environment.apiUrl}/promociones`;

const promocion = (id: number, nombre: string, estado: boolean, vigente: boolean) => ({
  id,
  nombre,
  tipo: 'porcentaje',
  fecha_inicio: '2026-10-15',
  fecha_fin: '2026-12-15',
  estado,
  vigente,
});

const pagina = (data: unknown[]) => ({
  data,
  meta: { total: data.length, page: 1, limit: 50, total_pages: 1 },
});

describe('PromocionesCard', () => {
  let fixture: ComponentFixture<PromocionesCard>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const lista = () => http.expectOne((r) => r.url === PROMOCIONES);

  function crear(activas: boolean, promociones: unknown[]) {
    fixture = TestBed.createComponent(PromocionesCard);
    el = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('activas', activas);
    fixture.detectChanges();
    lista().flush(pagina(promociones));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PromocionesCard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('con las promociones activas muestra cada una con su estado y cuántas están vigentes', () => {
    crear(true, [
      promocion(1, '-15% en mix', true, true),
      promocion(2, '2x1 en chifles', false, false),
      promocion(3, 'Envío gratis', true, false),
    ]);

    const texto = el.textContent ?? '';
    expect(texto).toContain('Promociones activas');
    expect(texto).toContain('1 promoción vigente se muestra en el portal del cliente');
    expect(texto).toContain('Vigente');
    expect(texto).toContain('Inactiva');
    expect(texto).toContain('Fuera de fechas');
    expect(texto).toContain('Descuento');
  });

  it('con las promociones apagadas todas aparecen pausadas y no se muestra ninguna', () => {
    crear(false, [promocion(1, '-15% en mix', true, true)]);

    const texto = el.textContent ?? '';
    expect(texto).toContain('Promociones desactivadas');
    expect(texto).toContain('Ninguna promoción se muestra en el portal del cliente');
    expect(texto).toContain('Pausada');
    expect(texto).not.toContain('Vigente');
  });

  it('emite el cambio del interruptor', () => {
    crear(true, []);
    const emitidos: boolean[] = [];
    fixture.componentInstance.activasChange.subscribe((v) => emitidos.push(v));

    el.querySelector<HTMLInputElement>('app-ds-switch input')!.click();

    expect(emitidos).toEqual([false]);
  });

  it('sin promociones lo dice', () => {
    crear(true, []);

    expect(el.textContent).toContain('No hay promociones');
  });

  it('si falla la carga ofrece reintentar', () => {
    fixture = TestBed.createComponent(PromocionesCard);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    lista().flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('boom');
    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    lista().flush(pagina([]));
  });
});
