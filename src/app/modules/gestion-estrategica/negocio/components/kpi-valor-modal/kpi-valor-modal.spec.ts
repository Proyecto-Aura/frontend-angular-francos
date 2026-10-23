import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../../../environments/environment';
import { Button } from '../../../../../shared/ds/button/button';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { KpiValorDto } from '../../interfaces/kpi-dto.interface';
import { Kpi } from '../../interfaces/kpi.interface';
import { KpiValorModal } from './kpi-valor-modal';

const KPI_BASE = `${environment.apiUrl}/kpis`;

function makePlan(overrides: Partial<PlanEstrategico> = {}): PlanEstrategico {
  return {
    id: 5,
    codigo: 'PE-0005',
    nombre: 'Plan institucional',
    descripcion: null,
    anioInicio: 2026,
    anioFin: 2027,
    estadoCodigo: 'ACTIVO',
    estadoNombre: 'Activo',
    activo: true,
    ...overrides,
  };
}

function makeKpi(): Kpi {
  return {
    id: 10,
    codigo: 'KPI-001',
    nombre: 'Margen operativo',
    formula: 'Utilidad / Ventas',
    objetivoId: 20,
    objetivoNombre: 'Incrementar rentabilidad',
    objetivoResponsable: 'Ana Torres',
    perspectivaId: 1,
    perspectivaNombre: 'Financiera',
    frecuenciaId: 2,
    frecuenciaNombre: 'Trimestral',
    unidadId: 3,
    unidadSimbolo: '%',
    metaFinal: 30,
    metas: [
      {
        anio: 2026,
        meta: 25,
        operador: '>=',
        valorAmarillo: 20,
        operadorAmarillo: '>=',
      },
      {
        anio: 2027,
        meta: 30,
        operador: '>=',
        valorAmarillo: 25,
        operadorAmarillo: '>=',
      },
    ],
    ultimoValor: null,
  };
}

function makeValorDto(overrides: Partial<KpiValorDto> = {}): KpiValorDto {
  return {
    id: 1,
    anio: 2026,
    periodo: { id: 4, codigo: 'T1', nombre: 'Trimestre 1' },
    valor: 24,
    semaforo: { color: 'AMARILLO', color_hex: '#ff0' },
    ...overrides,
  };
}

describe('KpiValorModal', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(plan = makePlan()): ComponentFixture<KpiValorModal> {
    const fixture = TestBed.createComponent(KpiValorModal);
    fixture.componentRef.setInput('plan', plan);
    fixture.componentRef.setInput('kpi', makeKpi());
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function flushLoad(historial: KpiValorDto[] = []): void {
    const periodos = httpMock.expectOne(
      (request) =>
        request.url === `${environment.apiUrl}/periodos` &&
        request.params.get('frecuencia_id') === '2',
    );
    expect(periodos.request.method).toBe('GET');
    periodos.flush([{ id: 4, codigo: 'T1', nombre: 'Trimestre 1', numero: 1, mes_fin: 3 }]);
    const valores = httpMock.expectOne(`${KPI_BASE}/10/valores`);
    expect(valores.request.method).toBe('GET');
    valores.flush(historial);
  }

  function primaryButton(fixture: ComponentFixture<KpiValorModal>): Button {
    const debug = fixture.debugElement
      .queryAll(By.directive(Button))
      .find((item) => (item.componentInstance as Button).variant() === 'primary');
    if (!debug) throw new Error('Primary button not found');
    return debug.componentInstance as Button;
  }

  it('loads periods and history when opened', () => {
    const fixture = create();
    flushLoad([makeValorDto()]);

    expect(fixture.componentInstance.periodos()).toEqual([
      expect.objectContaining({ id: 4, nombre: 'Trimestre 1' }),
    ]);
    expect(fixture.componentInstance.historial()).toEqual([
      expect.objectContaining({ id: 1, periodoId: 4 }),
    ]);
  });

  it('disables the main action when the plan is not active', () => {
    const fixture = create(makePlan({ estadoCodigo: 'BORRADOR', estadoNombre: 'Borrador' }));
    flushLoad();
    fixture.detectChanges();

    expect(primaryButton(fixture).disabled()).toBe(true);
  });

  it('emits saved and then closed after registering successfully', () => {
    const fixture = create();
    flushLoad();
    const events: string[] = [];
    fixture.componentInstance.saved.subscribe(() => events.push('saved'));
    fixture.componentInstance.closed.subscribe(() => events.push('closed'));
    fixture.componentInstance.periodoSeleccionado.set('2026:4');
    fixture.componentInstance.valor.set('26');

    fixture.componentInstance.registrar();

    const req = httpMock.expectOne(`${KPI_BASE}/10/valores`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ anio: 2026, periodo_id: 4, valor: 26 });
    req.flush(makeValorDto({ valor: 26 }));
    expect(events).toEqual(['saved', 'closed']);
  });

  it('changes the action from register to update and shows the replacement notice', () => {
    const fixture = create();
    flushLoad([makeValorDto()]);
    fixture.componentInstance.periodoSeleccionado.set('2026:4');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Actualizar valor');
    expect(fixture.nativeElement.textContent).toContain('Se reemplazará.');
  });

  it('shows the register label when the period has no existing value', () => {
    const fixture = create();
    flushLoad();
    fixture.componentInstance.periodoSeleccionado.set('2026:4');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Registrar valor');
  });

  it('shows Guardando… and disables the action while the request is pending', () => {
    const fixture = create();
    flushLoad();
    fixture.componentInstance.periodoSeleccionado.set('2026:4');
    fixture.componentInstance.valor.set('26');
    fixture.componentInstance.registrar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Guardando…');
    expect(primaryButton(fixture).disabled()).toBe(true);
    httpMock.expectOne(`${KPI_BASE}/10/valores`).flush(makeValorDto({ valor: 26 }));
  });

  it('keeps the modal open and resets saving state after a backend error', () => {
    const fixture = create();
    flushLoad();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentInstance.periodoSeleccionado.set('2026:4');
    fixture.componentInstance.valor.set('26');
    fixture.componentInstance.registrar();
    httpMock
      .expectOne(`${KPI_BASE}/10/valores`)
      .flush(
        { statusCode: 409, message: 'Solo se pueden registrar valores con el plan Activo' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(fixture.componentInstance.errorGeneral()).toContain('Solo se pueden registrar');
    expect(fixture.componentInstance.guardando()).toBe(false);
    expect(closed).toBe(0);
  });
});
