import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultadoGuardado } from '../../interfaces/pedido.interface';
import { API } from '../../testing/pedidos.fixtures';
import { makeReembolsoDetalleDto } from '../../testing/reembolsos.fixtures';
import { ReembolsoDetalle } from './reembolso-detalle';

describe('ReembolsoDetalle', () => {
  let fixture: ComponentFixture<ReembolsoDetalle>;
  let httpMock: HttpTestingController;
  let avisos: ResultadoGuardado[];

  const raiz = () => fixture.nativeElement as HTMLElement;
  const texto = () => raiz().textContent ?? '';
  const boton = (etiqueta: string) =>
    Array.from(raiz().querySelectorAll('button')).find((b) => b.textContent?.includes(etiqueta));
  const clic = (etiqueta: string) => {
    boton(etiqueta)?.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReembolsoDetalle);
    avisos = [];
    fixture.componentInstance.cambio.subscribe((a) => avisos.push(a));
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  const abrir = (dto = makeReembolsoDetalleDto()) => {
    fixture.componentRef.setInput('reembolsoId', dto.id);
    fixture.detectChanges();
    httpMock.expectOne(`${API}/reembolsos/${dto.id}`).flush(dto);
    fixture.detectChanges();
  };

  it('does not request anything while closed', () => {
    httpMock.expectNone((r) => r.url.startsWith(`${API}/reembolsos`));
  });

  it('shows the reason, evidence and amount to refund (RF-A041)', () => {
    abrir();

    expect(texto()).toContain('Solicitud SOL-000001');
    expect(texto()).toContain('PED-000004');
    expect(texto()).toContain('12 packs rotos');
    expect(texto()).toContain('evidencia-packs-rotos.pdf');
    expect(texto()).toContain('Validada');
    expect(texto()).toContain('Monto a devolver');
    const enlace = raiz().querySelector('a[aria-label^="Ver evidencia"]');
    expect(enlace?.getAttribute('href')).toContain('evidencia-packs-rotos.pdf');
  });

  it('warns when there is no evidence attached', () => {
    abrir(makeReembolsoDetalleDto({ evidencia: null }));

    expect(texto()).toContain('Sin evidencia adjunta');
  });

  it('approves a pending request and keeps the detail open (RF-A042)', () => {
    abrir();
    clic('Aprobar solicitud');

    httpMock
      .expectOne(`${API}/reembolsos/1/aprobar`)
      .flush(makeReembolsoDetalleDto({ estado: 'aprobado' }));
    fixture.detectChanges();

    expect(avisos).toEqual([
      {
        tono: 'ok',
        mensaje:
          'Solicitud SOL-000001 aprobada · devolución enviada a Culqi, en espera de confirmación · cliente notificado.',
      },
    ]);
    expect(texto()).toContain('Devolución enviada a Culqi');
    expect(boton('Aprobar solicitud')).toBeUndefined();
    expect(boton('Recibir confirmación de Culqi')).toBeDefined();
  });

  it('shows the API message when the approval is refused', () => {
    abrir(makeReembolsoDetalleDto({ evidencia: null }));
    clic('Aprobar solicitud');

    httpMock.expectOne(`${API}/reembolsos/1/aprobar`).flush(
      {
        statusCode: 409,
        message: 'No se puede aprobar SOL-000001: la solicitud requiere motivo y evidencia adjunta',
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(avisos[0]).toEqual({
      tono: 'error',
      mensaje: 'No se puede aprobar SOL-000001: la solicitud requiere motivo y evidencia adjunta',
    });
  });

  describe('reject (RF-A043)', () => {
    it('asks for the reason first and requires it', () => {
      abrir();
      clic('Rechazar solicitud');

      expect(texto()).toContain('Motivo del rechazo');
      clic('Confirmar rechazo');

      httpMock.expectNone(`${API}/reembolsos/1/rechazar`);
      expect(avisos).toEqual([
        { tono: 'error', mensaje: 'Indica el motivo del rechazo para continuar.' },
      ]);
    });

    it('rejects with the reason', () => {
      abrir();
      clic('Rechazar solicitud');

      const textarea = raiz().querySelector('textarea')!;
      textarea.value = '  Fuera del plazo de 48 horas.  ';
      textarea.dispatchEvent(new Event('input'));
      clic('Confirmar rechazo');

      const req = httpMock.expectOne(`${API}/reembolsos/1/rechazar`);
      expect(req.request.body).toEqual({ motivo_rechazo: 'Fuera del plazo de 48 horas.' });
      req.flush(
        makeReembolsoDetalleDto({
          estado: 'rechazado',
          motivo_rechazo: 'Fuera del plazo de 48 horas.',
        }),
      );
      fixture.detectChanges();

      expect(avisos[0].mensaje).toBe(
        'Solicitud SOL-000001 rechazada · cliente notificado con el motivo.',
      );
      expect(texto()).toContain('Solicitud rechazada');
      expect(boton('Confirmar rechazo')).toBeUndefined();
    });
  });

  it('registers the Culqi confirmation of an approved request (RF-A044)', () => {
    abrir(makeReembolsoDetalleDto({ estado: 'aprobado' }));
    clic('Recibir confirmación de Culqi');

    httpMock
      .expectOne(`${API}/reembolsos/1/confirmar-devolucion`)
      .flush(makeReembolsoDetalleDto({ estado: 'reembolsado' }));
    fixture.detectChanges();

    expect(avisos[0].mensaje).toBe(
      'Confirmación de Culqi recibida · solicitud SOL-000001 pasó a reembolsado · cliente notificado.',
    );
    expect(texto()).toContain('Devolución confirmada por Culqi');
  });

  it('has no Culqi confirmation for a cash payment', () => {
    abrir(makeReembolsoDetalleDto({ estado: 'aprobado', metodo_pago: 'efectivo' }));

    expect(boton('Recibir confirmación de Culqi')).toBeUndefined();
  });
});
