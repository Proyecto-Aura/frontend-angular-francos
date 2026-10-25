import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { EmpresaDto } from '../../interfaces/empresa-dto.interface';
import { DatosEmpresa } from './datos-empresa';

const EMPRESA_URL = `${environment.apiUrl}/empresa`;
const LOGO_URL = `${environment.apiUrl}/empresa/logo`;

function makeDto(overrides: Partial<EmpresaDto> = {}): EmpresaDto {
  return {
    id: 1,
    razon_social: 'Franco SAC',
    ruc: '20548712345',
    direccion: 'Av. Principal 100',
    telefono: null,
    email: null,
    logo_url: null,
    estado: true,
    es_emisora: true,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('DatosEmpresa', () => {
  let fixture: ComponentFixture<DatosEmpresa>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const campo = (id: string) => el.querySelector<HTMLInputElement>(`#${id} input, input#${id}`)!;
  const escribir = (id: string, valor: string) => {
    const input = campo(id);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;

  function crear(respuesta: EmpresaDto | 'sin-empresa' | 'error') {
    fixture = TestBed.createComponent(DatosEmpresa);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    const req = http.expectOne({ method: 'GET', url: EMPRESA_URL });
    if (respuesta === 'sin-empresa') {
      req.flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    } else if (respuesta === 'error') {
      req.flush({}, { status: 500, statusText: 'Server Error' });
    } else {
      req.flush(respuesta);
    }
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DatosEmpresa],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga los datos de la empresa en el formulario y deja los botones deshabilitados', () => {
    crear(makeDto({ telefono: '012345678', email: 'f@franco.pe' }));

    expect(campo('f-razon').value).toBe('Franco SAC');
    expect(campo('f-ruc').value).toBe('20548712345');
    expect(campo('f-telefono').value).toBe('012345678');
    expect(boton('Guardar cambios').disabled).toBe(true);
    expect(boton('Descartar').disabled).toBe(true);
    expect(el.textContent).toContain('Sin logo');
  });

  it('con 404 muestra el formulario vacío (empresa aún no registrada)', () => {
    crear('sin-empresa');

    expect(campo('f-razon').value).toBe('');
    expect(el.textContent).not.toContain('No se pudieron cargar');
  });

  it('si falla la carga muestra el error y permite reintentar', () => {
    crear('error');

    expect(el.textContent).toContain('No se pudieron cargar los datos de la empresa');
    boton('Reintentar').click();
    http.expectOne({ method: 'GET', url: EMPRESA_URL }).flush(makeDto());
    fixture.detectChanges();

    expect(campo('f-razon').value).toBe('Franco SAC');
  });

  it('habilita Guardar al editar y Descartar restaura lo guardado', () => {
    crear(makeDto());

    escribir('f-razon', 'Otra Razón SAC');
    expect(boton('Guardar cambios').disabled).toBe(false);

    boton('Descartar').click();
    fixture.detectChanges();

    expect(campo('f-razon').value).toBe('Franco SAC');
    expect(boton('Guardar cambios').disabled).toBe(true);
  });

  it('no envía nada y muestra los errores si faltan datos o el RUC es inválido', () => {
    crear('sin-empresa');
    escribir('f-ruc', '30548712345');

    boton('Guardar cambios').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Ingresar la razón social');
    expect(el.textContent).toContain('RUC inválido: 11 dígitos, inicia con 10 o 20');
    expect(el.textContent).toContain('Ingresar la dirección fiscal');
    http.expectNone({ method: 'PUT', url: EMPRESA_URL });
  });

  it('guarda con PUT y muestra "Guardado"', () => {
    crear(makeDto());
    escribir('f-razon', 'Franco Nuevo SAC');

    boton('Guardar cambios').click();
    const req = http.expectOne({ method: 'PUT', url: EMPRESA_URL });
    expect((req.request.body as { razon_social: string }).razon_social).toBe('Franco Nuevo SAC');
    req.flush(makeDto({ razon_social: 'Franco Nuevo SAC' }));
    fixture.detectChanges();

    expect(el.querySelector('[role="status"]')?.textContent).toContain(
      'Los datos de la empresa se guardaron correctamente.',
    );
    expect(boton('Guardar cambios').disabled).toBe(true);
  });

  it('muestra el mensaje del backend si el RUC ya existe (409)', () => {
    crear(makeDto());
    escribir('f-ruc', '20999999999');

    boton('Guardar cambios').click();
    http
      .expectOne({ method: 'PUT', url: EMPRESA_URL })
      .flush(
        { message: 'Ya existe una empresa con ese RUC' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Ya existe una empresa con ese RUC',
    );
    expect(boton('Guardar cambios').disabled).toBe(false);
  });

  it('rechaza un logo que no es PNG/JPG o supera 1 MB sin habilitar Guardar', () => {
    crear(makeDto());
    const selector = el.querySelector<HTMLInputElement>('input[type="file"]')!;

    const subirArchivo = (archivo: File) => {
      Object.defineProperty(selector, 'files', { value: [archivo], configurable: true });
      selector.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };

    subirArchivo(new File(['x'], 'logo.gif', { type: 'image/gif' }));
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Formato no admitido. Usar PNG o JPG',
    );

    subirArchivo(new File([new Uint8Array(1024 * 1024 + 1)], 'logo.png', { type: 'image/png' }));
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('El archivo supera 1 MB');
    expect(boton('Guardar cambios').disabled).toBe(true);
  });

  it('al guardar con un logo nuevo guarda los datos y luego sube el archivo', () => {
    crear(makeDto());
    URL.createObjectURL = () => 'blob:previa';
    URL.revokeObjectURL = () => undefined;
    const selector = el.querySelector<HTMLInputElement>('input[type="file"]')!;
    const archivo = new File(['x'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(selector, 'files', { value: [archivo], configurable: true });
    selector.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(boton('Guardar cambios').disabled).toBe(false);
    boton('Guardar cambios').click();
    http.expectOne({ method: 'PUT', url: EMPRESA_URL }).flush(makeDto());
    const subida = http.expectOne({ method: 'POST', url: LOGO_URL });
    expect((subida.request.body as FormData).get('logo')).toBe(archivo);
    subida.flush(makeDto({ logo_url: 'http://media.test/empresa/nuevo.png' }));
    fixture.detectChanges();

    expect(el.querySelector('img')?.getAttribute('src')).toBe(
      'http://media.test/empresa/nuevo.png',
    );
    expect(boton('Guardar cambios').disabled).toBe(true);
  });

  it('"Quitar" pide DELETE del logo al guardar', () => {
    crear(makeDto({ logo_url: 'http://media.test/empresa/logo.png' }));
    expect(el.querySelector('img')).not.toBeNull();

    boton('Quitar').click();
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(boton('Guardar cambios').disabled).toBe(false);

    boton('Guardar cambios').click();
    http.expectOne({ method: 'PUT', url: EMPRESA_URL }).flush(makeDto({ logo_url: 'x' }));
    http.expectOne({ method: 'DELETE', url: LOGO_URL }).flush(makeDto({ logo_url: null }));
    fixture.detectChanges();

    expect(el.textContent).toContain('Sin logo');
  });
});
