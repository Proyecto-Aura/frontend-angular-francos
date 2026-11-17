import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { TAMANO_MAXIMO } from '../../../negocio/components/documento-estrategico-subir-modal/documento-estrategico.archivo';
import { DocumentoEstrategicoDto } from '../../../negocio/interfaces/documento-estrategico-dto.interface';
import { DocumentoEstrategico } from '../../../negocio/interfaces/documento-estrategico.interface';
import { DocumentoEstrategicoTiSubirModal } from './documento-estrategico-ti-subir-modal';

const DOCUMENTOS_BASE = `${environment.apiUrl}/documentos-estrategicos-ti`;

function makeDocumentoDto(
  overrides: Partial<DocumentoEstrategicoDto> = {},
): DocumentoEstrategicoDto {
  return {
    id: 7,
    plan_estrategico_id: 5,
    nombre: 'Análisis PESTEL',
    nombre_original: 'analisis.pdf',
    estado: true,
    created_at: '2026-10-01T12:30:00.000Z',
    updated_at: '2026-10-01T12:30:00.000Z',
    url: 'https://storage.example/analisis.pdf',
    ...overrides,
  };
}

function makeFile(nombre = 'analisis.pdf', size = 2048): File {
  const file = new File(['x'], nombre, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('DocumentoEstrategicoTiSubirModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(open = true): ComponentFixture<DocumentoEstrategicoTiSubirModal> {
    const fixture = TestBed.createComponent(DocumentoEstrategicoTiSubirModal);
    fixture.componentRef.setInput('planId', 5);
    fixture.componentRef.setInput('planNombre', 'Plan institucional');
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(fixture: ComponentFixture<DocumentoEstrategicoTiSubirModal>): File {
    const file = makeFile();
    fixture.componentInstance.nombre.set('Análisis PESTEL');
    fixture.componentInstance.archivo.set(file);
    return file;
  }

  function flushError(status: number, message: string | string[]): void {
    httpMock
      .expectOne(DOCUMENTOS_BASE)
      .flush({ message }, { status, statusText: status === 409 ? 'Conflict' : 'Error' });
  }

  it('renders the TI upload title', () => {
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Subir documento estratégico de TI');
  });

  it('resets values and errors whenever it opens', () => {
    const fixture = create(false);
    const component = fixture.componentInstance;
    component.nombre.set('Anterior');
    component.archivo.set(makeFile());
    component.errorNombre.set('Error');
    component.errorArchivo.set('Error');
    component.errorGeneral.set('Error');

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(component.nombre()).toBe('');
    expect(component.archivo()).toBeNull();
    expect(component.errorNombre()).toBeNull();
    expect(component.errorArchivo()).toBeNull();
    expect(component.errorGeneral()).toBeNull();
  });

  it('does not POST an empty form and marks both required fields', () => {
    const component = create().componentInstance;

    component.guardar();

    expect(component.errorNombre()).toBe('El nombre es obligatorio.');
    expect(component.errorArchivo()).toBe('Selecciona un archivo.');
    httpMock.expectNone(DOCUMENTOS_BASE);
  });

  it('rejects a name longer than 200 characters without POSTing', () => {
    const fixture = create();
    fixture.componentInstance.nombre.set('x'.repeat(201));
    fixture.componentInstance.archivo.set(makeFile());

    fixture.componentInstance.guardar();

    expect(fixture.componentInstance.errorNombre()).toBe(
      'El nombre no puede superar los 200 caracteres.',
    );
    httpMock.expectNone(DOCUMENTOS_BASE);
  });

  it('selects a valid input file, autofills the name and renders its card', () => {
    const fixture = create();
    const file = makeFile('Analisis PESTEL.pdf');
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.archivo()).toBe(file);
    expect(fixture.componentInstance.nombre()).toBe('Analisis PESTEL');
    expect(fixture.nativeElement.textContent).toContain('Analisis PESTEL.pdf');
    expect(fixture.nativeElement.textContent).toContain('2 KB');
  });

  it('accepts a dropped file without overwriting an existing name', () => {
    const fixture = create();
    const file = makeFile('otro.pdf');
    fixture.componentInstance.nombre.set('Nombre manual');
    const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
    Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });

    fixture.componentInstance.soltarArchivo(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.archivo()).toBe(file);
    expect(fixture.componentInstance.nombre()).toBe('Nombre manual');
    expect(fixture.nativeElement.textContent).toContain('otro.pdf');
  });

  it.each([
    [makeFile('presentacion.pptx'), 'Formato no permitido.'],
    [makeFile('grande.pdf', TAMANO_MAXIMO + 1), 'El archivo supera los 10 MB.'],
  ])('rejects an invalid file and does not keep it selected', (file, message) => {
    const component = create().componentInstance;
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    component.seleccionarArchivo({ target: input } as unknown as Event);

    expect(component.errorArchivo()).toBe(message);
    expect(component.archivo()).toBeNull();
  });

  it('removes the selected file and clears its error', () => {
    const component = create().componentInstance;
    component.archivo.set(makeFile());
    component.errorArchivo.set('Error anterior');

    component.quitarArchivo();

    expect(component.archivo()).toBeNull();
    expect(component.errorArchivo()).toBeNull();
  });

  it('uploads, disables the submit button, then emits saved and closed', () => {
    const fixture = create();
    const file = fillValidForm(fixture);
    const saved: DocumentoEstrategico[] = [];
    let closed = 0;
    fixture.componentInstance.saved.subscribe((documento) => saved.push(documento));
    fixture.componentInstance.closed.subscribe(() => closed++);

    fixture.componentInstance.guardar();
    fixture.detectChanges();

    const submit = (
      Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
    ).find((button) => button.textContent?.includes('Subiendo'));
    expect(fixture.componentInstance.guardando()).toBe(true);
    expect(submit?.disabled).toBe(true);
    const req = httpMock.expectOne(DOCUMENTOS_BASE);
    expect((req.request.body as FormData).get('archivo')).toBe(file);
    req.flush(makeDocumentoDto());

    expect(saved).toEqual([expect.objectContaining({ id: 7, tipo: 'PDF' })]);
    expect(closed).toBe(1);
    expect(fixture.componentInstance.guardando()).toBe(false);
  });

  it('puts a duplicate-name conflict on the name field', () => {
    const fixture = create();
    fillValidForm(fixture);
    let saved = 0;
    fixture.componentInstance.saved.subscribe(() => saved++);

    fixture.componentInstance.guardar();
    flushError(409, 'Ya existe un documento registrado con ese nombre en el plan');

    expect(fixture.componentInstance.errorNombre()).toBe(
      'Ya existe un documento con este nombre en el plan.',
    );
    expect(saved).toBe(0);
  });

  it('shows a draft conflict as a general error', () => {
    const fixture = create();
    fillValidForm(fixture);
    const message = 'Solo se pueden subir documentos cuando el plan está en Borrador';

    fixture.componentInstance.guardar();
    flushError(409, message);

    expect(fixture.componentInstance.errorGeneral()).toBe(message);
  });

  it('joins a backend message array on a bad file response', () => {
    const fixture = create();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    flushError(400, ['Formato inválido', 'Tamaño inválido']);

    expect(fixture.componentInstance.errorArchivo()).toBe('Formato inválido Tamaño inválido');
  });

  it('shows a permission error for a forbidden response', () => {
    const fixture = create();
    fillValidForm(fixture);

    fixture.componentInstance.guardar();
    flushError(403, 'Forbidden');

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No tiene permisos para gestionar documentos estratégicos.',
    );
  });

  it('shows a generic error for an unexpected response without emitting saved', () => {
    const fixture = create();
    fillValidForm(fixture);
    let saved = 0;
    fixture.componentInstance.saved.subscribe(() => saved++);

    fixture.componentInstance.guardar();
    flushError(500, 'Error interno');

    expect(fixture.componentInstance.errorGeneral()).toBe(
      'No se pudo subir el documento. Intente nuevamente.',
    );
    expect(saved).toBe(0);
  });
});
