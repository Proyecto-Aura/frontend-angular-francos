import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { PlantillaCorreo } from '../../interfaces/notificacion.interface';
import { toPlantillaCorreo } from '../../mappers/notificacion.mapper';
import { makePlantillaDto } from '../../testing/notificacion.fixtures';
import { PlantillaEditarModal } from './plantilla-editar-modal';

const PLANTILLAS_URL = `${environment.apiUrl}/parametros-notificaciones/plantillas`;

describe('PlantillaEditarModal', () => {
  let fixture: ComponentFixture<PlantillaEditarModal>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let guardados: PlantillaCorreo[];
  let cierres: number;

  const plantilla = toPlantillaCorreo(makePlantillaDto());

  const abrir = () => {
    fixture.componentRef.setInput('plantilla', plantilla);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  };
  const escribir = (id: string, valor: string) => {
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlantillaEditarModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlantillaEditarModal);
    el = fixture.nativeElement as HTMLElement;
    guardados = [];
    cierres = 0;
    fixture.componentInstance.saved.subscribe((p) => guardados.push(p));
    fixture.componentInstance.closed.subscribe(() => cierres++);
  });

  afterEach(() => http.verify());

  it('muestra el nombre de la plantilla, el destinatario y las variables disponibles', () => {
    abrir();

    expect(el.textContent).toContain('Editar: Verificación de email');
    expect(el.textContent).toContain('Cliente');
    expect(el.textContent).toContain('{{nombre}}');
    expect(el.textContent).toContain('{{enlace}}');
  });

  it('precarga el asunto y el cuerpo actuales', () => {
    abrir();

    expect(el.querySelector<HTMLInputElement>('#plantilla-asunto')!.value).toBe(plantilla.asunto);
    expect(el.querySelector<HTMLTextAreaElement>('#plantilla-cuerpo')!.value).toBe(
      plantilla.cuerpo,
    );
  });

  it('al guardar vacío muestra los errores y no llama al backend', () => {
    abrir();
    escribir('plantilla-asunto', '');
    escribir('plantilla-cuerpo', '');

    boton('Guardar cambios').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Ingresar el asunto');
    expect(el.textContent).toContain('Ingresar el cuerpo del correo');
    http.expectNone(`${PLANTILLAS_URL}/verificacion_email`);
  });

  it('guarda los cambios, avisa al padre y cierra el modal', () => {
    abrir();
    escribir('plantilla-asunto', 'Nuevo asunto');

    boton('Guardar cambios').click();
    const req = http.expectOne({
      method: 'PATCH',
      url: `${PLANTILLAS_URL}/verificacion_email`,
    });
    expect(req.request.body).toEqual({ asunto: 'Nuevo asunto', cuerpo: plantilla.cuerpo });
    req.flush(makePlantillaDto({ asunto: 'Nuevo asunto' }));

    expect(guardados).toHaveLength(1);
    expect(guardados[0].asunto).toBe('Nuevo asunto');
    expect(cierres).toBe(1);
  });

  it('muestra el error del backend sin cerrar el modal', () => {
    abrir();

    boton('Guardar cambios').click();
    http
      .expectOne({ method: 'PATCH', url: `${PLANTILLAS_URL}/verificacion_email` })
      .flush({ message: 'No se pudo guardar' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.textContent).toContain('No se pudo guardar');
    expect(cierres).toBe(0);
  });

  it('al volver a abrir el modal el formulario está limpio con los datos de la plantilla', () => {
    abrir();
    escribir('plantilla-asunto', 'Algo temporal');
    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(el.querySelector<HTMLInputElement>('#plantilla-asunto')!.value).toBe(plantilla.asunto);
  });

  it('Cancelar cierra sin guardar', () => {
    abrir();

    boton('Cancelar').click();

    expect(cierres).toBe(1);
    expect(guardados).toHaveLength(0);
  });
});
