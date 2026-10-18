import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API, page } from '../../testing/pedidos.fixtures';
import {
  makeReembolsoDetalleDto,
  makeReembolsoResumenDto,
} from '../../testing/reembolsos.fixtures';
import { Reembolsos } from './reembolsos';

describe('Reembolsos', () => {
  let fixture: ComponentFixture<Reembolsos>;
  let httpMock: HttpTestingController;

  const raiz = () => fixture.nativeElement as HTMLElement;
  const texto = () => raiz().textContent ?? '';
  const listado = () => httpMock.expectOne((r) => r.url === `${API}/reembolsos`);

  const filas = [
    makeReembolsoResumenDto(),
    makeReembolsoResumenDto({
      id: 2,
      codigo: 'SOL-000002',
      estado: 'rechazado',
      metodo_pago: 'efectivo',
    }),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Reembolsos);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('lists the refund requests (RF-A039)', () => {
    listado().flush(page(filas));
    fixture.detectChanges();

    expect(texto()).toContain('Reembolsos');
    expect(texto()).toContain('SOL-000001');
    expect(texto()).toContain('PED-000004');
    expect(texto()).toContain('Rosa Elena Quispe Huamán');
    expect(texto()).toContain('Pendiente');
    expect(texto()).toContain('Rechazado');
    expect(texto()).toContain('2 solicitudes');
  });

  it('filters by state and shows "x of y" (RF-A040)', () => {
    listado().flush(page(filas, 5));
    fixture.detectChanges();

    const select = fixture.componentInstance as unknown as { setEstado(v: string): void };
    select.setEstado('rechazado');
    const req = listado();
    expect(req.request.params.get('estado')).toBe('rechazado');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(page([filas[1]], 1));
    fixture.detectChanges();

    expect(texto()).toContain('1 de 5 solicitudes');
    expect(texto()).toContain('Limpiar filtros');
  });

  it('offers to retry when the list fails', () => {
    listado().flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(texto()).toContain('No se pudieron cargar las solicitudes de reembolso.');
  });

  it('opens the detail and reloads the list after an action', () => {
    listado().flush(page(filas));
    fixture.detectChanges();

    raiz()
      .querySelector<HTMLButtonElement>('button[aria-label="Ver solicitud SOL-000001"]')!
      .click();
    fixture.detectChanges();
    httpMock.expectOne(`${API}/reembolsos/1`).flush(makeReembolsoDetalleDto());
    fixture.detectChanges();

    Array.from(raiz().querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Aprobar solicitud'))!
      .click();
    httpMock
      .expectOne(`${API}/reembolsos/1/aprobar`)
      .flush(makeReembolsoDetalleDto({ estado: 'aprobado' }));
    fixture.detectChanges();

    listado().flush(page(filas));
    fixture.detectChanges();
    expect(texto()).toContain('Solicitud SOL-000001 aprobada');
  });
});
