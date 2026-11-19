import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import {
  makeCanalEmailDto,
  makeCanalPortalDto,
  makePlantillaDto,
} from '../../testing/notificacion.fixtures';
import { GestionarNotificaciones } from './gestionar-notificaciones';

const CANALES_URL = `${environment.apiUrl}/parametros-notificaciones/canales`;
const PLANTILLAS_URL = `${environment.apiUrl}/parametros-notificaciones/plantillas`;

describe('GestionarNotificaciones', () => {
  let fixture: ComponentFixture<GestionarNotificaciones>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;

  function crear(
    opts: {
      canales?: ReturnType<typeof makeCanalEmailDto>[];
      plantillas?: ReturnType<typeof makePlantillaDto>[];
      error?: boolean;
    } = {},
  ) {
    fixture = TestBed.createComponent(GestionarNotificaciones);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    if (opts.error) {
      const canales = http.expectOne(CANALES_URL);
      const plantillas = http.expectOne(PLANTILLAS_URL);
      canales.flush('error', { status: 500, statusText: 'Server Error' });
      expect(plantillas.cancelled).toBe(true);
    } else {
      http
        .expectOne(CANALES_URL)
        .flush(opts.canales ?? [makeCanalEmailDto(), makeCanalPortalDto()]);
      http.expectOne(PLANTILLAS_URL).flush(opts.plantillas ?? [makePlantillaDto()]);
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GestionarNotificaciones],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga los canales y muestra la tarjeta de email y la de portal', () => {
    crear();

    const texto = el.textContent ?? '';
    expect(texto).toContain('Gestionar parámetros de notificaciones');
    expect(texto).toContain('Email (SMTP)');
    expect(texto).toContain('no-reply@francos.pe');
    expect(texto).toContain('Notificación en el portal');
    expect(texto).toContain('Clientes del Portal B');
  });

  it('muestra el conteo de plantillas en la pestaña', () => {
    crear({ plantillas: [makePlantillaDto(), makePlantillaDto({ clave: 'bienvenida_cliente' })] });

    expect(el.querySelector('[role="tab"]')?.parentElement?.textContent).toContain('2');
  });

  it('si falla la carga muestra el error y Reintentar vuelve a consultar', () => {
    crear({ error: true });

    expect(el.textContent).toContain('No se pudieron cargar los parámetros de notificaciones');

    boton('Reintentar').click();
    http.expectOne(CANALES_URL).flush([makeCanalEmailDto(), makeCanalPortalDto()]);
    http.expectOne(PLANTILLAS_URL).flush([makePlantillaDto()]);
    fixture.detectChanges();

    expect(el.textContent).toContain('Email (SMTP)');
  });

  it('cambiar de pestaña muestra la tabla de plantillas', () => {
    crear();

    const pestanaPlantillas = Array.from(
      el.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ).find((t) => t.textContent?.includes('Plantillas de correo'))!;
    pestanaPlantillas.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Verificación de email');
    expect(el.textContent).toContain('{{nombre}}');
  });

  it('activar/desactivar el canal de email llama al backend y avisa', () => {
    crear({ canales: [makeCanalEmailDto({ activo: false }), makeCanalPortalDto()] });

    el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    fixture.detectChanges();

    const req = http.expectOne({ method: 'PATCH', url: `${CANALES_URL}/email` });
    expect(req.request.body).toEqual({ activo: true });
    req.flush(makeCanalEmailDto({ activo: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.toast()).toMatchObject({
      tone: 'success',
      title: 'Canal de email actualizado',
    });
  });

  it('si falla el cambio de canal, revierte el switch y avisa el error', () => {
    crear({ canales: [makeCanalEmailDto({ activo: false }), makeCanalPortalDto()] });

    el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    fixture.detectChanges();

    http
      .expectOne({ method: 'PATCH', url: `${CANALES_URL}/email` })
      .flush({ message: 'No se pudo' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(
      el.querySelector<HTMLInputElement>('app-canal-email-card input[type="checkbox"]')!.checked,
    ).toBe(false);
    expect(fixture.componentInstance.toast()?.tone).toBe('error');
  });

  it('editar una plantilla abre el modal, y al guardar actualiza la fila y avisa', () => {
    crear();

    const pestanaPlantillas = Array.from(
      el.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ).find((t) => t.textContent?.includes('Plantillas de correo'))!;
    pestanaPlantillas.click();
    fixture.detectChanges();

    el.querySelector<HTMLButtonElement>(
      'button[aria-label="Editar Verificación de email"]',
    )!.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')?.textContent).toContain(
      'Editar: Verificación de email',
    );

    const asuntoInput = el.querySelector<HTMLInputElement>('#plantilla-asunto')!;
    asuntoInput.value = 'Asunto nuevo';
    asuntoInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    Array.from(el.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Guardar cambios'))!
      .click();
    http
      .expectOne({ method: 'PATCH', url: `${PLANTILLAS_URL}/verificacion_email` })
      .flush(makePlantillaDto({ asunto: 'Asunto nuevo' }));
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(fixture.componentInstance.toast()).toMatchObject({
      tone: 'success',
      title: 'Plantilla actualizada',
    });
    el.querySelector<HTMLButtonElement>(
      'button[aria-label="Editar Verificación de email"]',
    )!.click();
    fixture.detectChanges();
    expect(el.querySelector<HTMLInputElement>('#plantilla-asunto')!.value).toBe('Asunto nuevo');
  });
  it.each(['TLS', 'STARTTLS'])(
    'muestra SMTP del GET como solo lectura y excluye esos datos del PATCH (%s)',
    (seguridad) => {
      const datos = {
        remitente: 'Avisos <correo@example.test>',
        servidor_smtp: 'smtp.configuracion.test',
        seguridad,
      };
      crear({ canales: [makeCanalEmailDto(datos), makeCanalPortalDto()] });
      const tarjeta = el.querySelector('app-canal-email-card')!;
      const valores = () =>
        Array.from(tarjeta.querySelectorAll('dd')).map((campo) => campo.textContent?.trim());
      expect(valores()).toEqual([datos.remitente, datos.servidor_smtp, datos.seguridad]);
      expect(
        tarjeta.querySelectorAll('input:not([type="checkbox"]), textarea, select'),
      ).toHaveLength(0);

      tarjeta.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
      fixture.detectChanges();
      const req = http.expectOne({ method: 'PATCH', url: `${CANALES_URL}/email` });
      expect(req.request.body).toEqual({ activo: false });
      req.flush(makeCanalEmailDto({ ...datos, activo: false }));
      fixture.detectChanges();
      expect(valores()).toEqual([datos.remitente, datos.servidor_smtp, datos.seguridad]);
    },
  );
});
