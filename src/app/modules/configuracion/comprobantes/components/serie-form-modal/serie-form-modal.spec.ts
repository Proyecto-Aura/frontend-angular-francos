import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { SerieComprobante } from '../../interfaces/serie-comprobante.interface';
import { toSerieComprobante } from '../../mappers/serie-comprobante.mapper';
import { makeSerieDto } from '../../testing/serie-fixtures';
import { SerieFormModal, SerieGuardada } from './serie-form-modal';

const URL = `${environment.apiUrl}/series-comprobante`;

describe('SerieFormModal', () => {
  let fixture: ComponentFixture<SerieFormModal>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let guardadas: SerieGuardada[];
  let cierres: number;

  const abrir = (serie: SerieComprobante | null = null) => {
    fixture.componentRef.setInput('serie', serie);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  };
  const escribir = (id: string, valor: string) => {
    const input = el.querySelector<HTMLInputElement>(`input#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const elegirTipo = (valor: string) => {
    const select = el.querySelector<HTMLSelectElement>('select#s-tipo')!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const boton = (texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SerieFormModal],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SerieFormModal);
    el = fixture.nativeElement as HTMLElement;
    guardadas = [];
    cierres = 0;
    fixture.componentInstance.saved.subscribe((g) => guardadas.push(g));
    fixture.componentInstance.closed.subscribe(() => cierres++);
  });

  afterEach(() => http.verify());

  describe('nueva serie', () => {
    it('muestra el título, los valores iniciales y el switch de estado', () => {
      abrir();

      expect(el.textContent).toContain('Nueva serie');
      expect(el.textContent).toContain('Serie autorizada para emisión electrónica');
      expect(el.textContent).toContain('El correlativo se asigna automáticamente en cada emisión');
      // El 1 y el 99999999 solo se sugieren como texto de ejemplo: los campos arrancan vacíos.
      expect(el.querySelector<HTMLInputElement>('input#s-inicio')?.value).toBe('');
      expect(el.querySelector<HTMLInputElement>('input#s-inicio')?.placeholder).toBe('1');
      expect(el.querySelector<HTMLInputElement>('input#s-fin')?.value).toBe('');
      expect(el.querySelector<HTMLInputElement>('input#s-fin')?.placeholder).toBe('99999999');
      expect(el.textContent).toContain('Disponible para emitir');
      expect(el.textContent).toContain('Inicia con F');
    });

    it('ofrece factura y boleta como tipos, sin notas de crédito', () => {
      abrir();

      const opciones = Array.from(el.querySelectorAll<HTMLOptionElement>('select#s-tipo option'))
        .map((o) => o.textContent?.trim())
        .filter(Boolean);
      expect(opciones).toEqual(['Factura electrónica', 'Boleta de venta electrónica']);
    });

    it('al cambiar a boleta la pista pide que empiece por B', () => {
      abrir();

      elegirTipo('boleta');

      expect(el.textContent).toContain('Inicia con B');
    });

    it('al guardar sin serie muestra el error y no llama al backend', () => {
      abrir();

      boton('Crear serie').click();
      fixture.detectChanges();

      expect(el.textContent).toContain('Formato: F + 3 caracteres');
      http.expectNone(URL);
    });

    it('rechaza un prefijo que no corresponde al tipo', () => {
      abrir();
      elegirTipo('boleta');
      escribir('s-serie', 'F001');
      escribir('s-inicio', '1');
      escribir('s-fin', '5000');

      boton('Crear serie').click();
      fixture.detectChanges();

      expect(el.textContent).toContain('Formato: B + 3 caracteres');
      http.expectNone(URL);
    });

    it('valida el rango antes de guardar', () => {
      abrir();
      escribir('s-serie', 'F001');
      escribir('s-inicio', '1');
      escribir('s-fin', '5000');
      escribir('s-inicio', '0');
      escribir('s-fin', '100000000');

      boton('Crear serie').click();
      fixture.detectChanges();

      expect(el.textContent).toContain('Mínimo 1');
      expect(el.textContent).toContain('Máximo 99999999');
      http.expectNone(URL);
    });

    it('crea la serie en mayúsculas, avisa al padre y cierra el modal', () => {
      abrir();
      escribir('s-serie', 'f002');
      escribir('s-inicio', '1');
      escribir('s-fin', '5000');

      boton('Crear serie').click();
      const req = http.expectOne({ method: 'POST', url: URL });
      expect(req.request.body).toEqual({
        tipo: 'factura',
        serie: 'F002',
        correlativo_inicio: 1,
        correlativo_fin: 5000,
        estado: true,
      });
      req.flush(makeSerieDto({ serie: 'F002', correlativo_fin: 5000 }));

      expect(guardadas).toHaveLength(1);
      expect(guardadas[0].modo).toBe('nueva');
      expect(guardadas[0].serie.codigo).toBe('F002');
      expect(cierres).toBe(1);
    });

    it('marca la serie como ya existente cuando el backend responde 409', () => {
      abrir();
      escribir('s-serie', 'F001');
      escribir('s-inicio', '1');
      escribir('s-fin', '5000');

      boton('Crear serie').click();
      http
        .expectOne({ method: 'POST', url: URL })
        .flush({ message: 'Ya existe una serie con ese código' }, { status: 409, statusText: 'x' });
      fixture.detectChanges();

      expect(el.textContent).toContain('La serie ya existe');
      expect(guardadas).toHaveLength(0);
      expect(cierres).toBe(0);
    });

    it('muestra el aviso general si ya hay una serie activa de ese tipo', () => {
      abrir();
      escribir('s-serie', 'F009');
      escribir('s-inicio', '1');
      escribir('s-fin', '5000');

      boton('Crear serie').click();
      http.expectOne({ method: 'POST', url: URL }).flush(
        {
          message: 'Ya existe una serie activa de tipo factura; desactívala antes de activar otra',
        },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain(
        'Ya existe una serie activa de tipo factura',
      );
    });
  });

  describe('editar serie', () => {
    const sinEmitir = toSerieComprobante(
      makeSerieDto({
        correlativo_fin: 5000,
        correlativo_actual: null,
        siguiente: 1,
        restantes: 5000,
      }),
    );
    const emitida = toSerieComprobante(makeSerieDto({ correlativo_fin: 5000 }));

    it('muestra el título con la serie, el tipo y el próximo correlativo', () => {
      abrir(sinEmitir);

      expect(el.textContent).toContain('Editar serie F001');
      expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Factura electrónica');
      expect(el.querySelector<HTMLInputElement>('input#s-proximo')?.value).toBe('F001-00000001');
      expect(el.textContent).toContain('Asignado por el sistema · no editable');
    });

    it('no muestra el switch de estado', () => {
      abrir(sinEmitir);

      expect(el.textContent).not.toContain('Disponible para emitir');
    });

    it('una serie sin emitir se puede editar completa', () => {
      abrir(sinEmitir);

      expect(el.querySelector<HTMLInputElement>('input#s-serie')?.disabled).toBe(false);
      expect(el.querySelector<HTMLInputElement>('input#s-inicio')?.disabled).toBe(false);
      expect(el.textContent).not.toContain('la serie ya tiene emisiones');
    });

    it('una serie que ya emitió solo deja ampliar el final', () => {
      abrir(emitida);

      expect(el.textContent).toContain('No editable: la serie ya tiene emisiones');
      expect(el.querySelector<HTMLInputElement>('input#s-serie')?.disabled).toBe(true);
      expect(el.querySelector<HTMLInputElement>('input#s-inicio')?.disabled).toBe(true);
      expect(el.querySelector<HTMLSelectElement>('select#s-tipo')?.disabled).toBe(true);
      expect(el.querySelector<HTMLInputElement>('input#s-fin')?.disabled).toBe(false);
    });

    it('una serie agotada muestra "Rango agotado" como próximo correlativo', () => {
      abrir(
        toSerieComprobante(
          makeSerieDto({ correlativo_fin: 1000, correlativo_actual: 1000, siguiente: null }),
        ),
      );

      expect(el.querySelector<HTMLInputElement>('input#s-proximo')?.value).toBe('Rango agotado');
    });

    it('no deja bajar el final del último número emitido', () => {
      abrir(emitida);
      escribir('s-fin', '1000');

      boton('Guardar cambios').click();
      fixture.detectChanges();

      expect(el.textContent).toContain('No puede ser menor al último emitido (1847)');
      http.expectNone({ method: 'PATCH', url: `${URL}/1` });
    });

    it('no deja reducir el final de una serie que ya emitió', () => {
      abrir(emitida);
      escribir('s-fin', '4000');

      boton('Guardar cambios').click();
      fixture.detectChanges();

      expect(el.textContent).toContain('Solo se puede ampliar');
      http.expectNone({ method: 'PATCH', url: `${URL}/1` });
    });

    it('amplía el final enviando solo ese campo', () => {
      abrir(emitida);
      escribir('s-fin', '9000');

      boton('Guardar cambios').click();
      const req = http.expectOne({ method: 'PATCH', url: `${URL}/1` });
      expect(req.request.body).toEqual({ correlativo_fin: 9000 });
      req.flush(makeSerieDto({ correlativo_fin: 9000 }));

      expect(guardadas[0].modo).toBe('editar');
      expect(cierres).toBe(1);
    });

    it('si no cambió nada guarda sin llamar al backend', () => {
      abrir(emitida);

      boton('Guardar cambios').click();

      http.expectNone({ method: 'PATCH', url: `${URL}/1` });
      expect(guardadas).toHaveLength(1);
      expect(cierres).toBe(1);
    });

    it('muestra el error del backend y se queda abierto', () => {
      abrir(emitida);
      escribir('s-fin', '9000');

      boton('Guardar cambios').click();
      http
        .expectOne({ method: 'PATCH', url: `${URL}/1` })
        .flush({ message: 'No se pudo guardar' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo guardar');
      expect(cierres).toBe(0);
    });
  });
});
