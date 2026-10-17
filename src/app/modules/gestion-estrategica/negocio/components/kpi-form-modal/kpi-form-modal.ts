import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideCheck, LucideLock, LucidePlus } from '@lucide/angular';
import { finalize, forkJoin } from 'rxjs';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { PlanEstrategico } from '../../../plan-estrategico/interfaces/plan-estrategico.interface';
import { KpiApiErrorDto } from '../../interfaces/kpi-dto.interface';
import {
  Frecuencia,
  Kpi,
  KpiForm,
  MetaAnualForm,
  UnidadMedida,
} from '../../interfaces/kpi.interface';
import { ObjetivoEstrategico } from '../../interfaces/objetivo-estrategico.interface';
import { CatalogoKpiService } from '../../services/catalogo-kpi.service';
import { KpiService } from '../../services/kpi.service';
import { ErroresFilasMetas, formatearValor, validarFilasMetas } from './kpi.reglas';

interface ErroresGeneralesForm {
  nombre?: string;
  formula?: string;
  objetivoId?: string;
  frecuenciaId?: string;
  unidadId?: string;
}

@Component({
  imports: [Badge, Button, Field, Icon, Input, Modal, Select, Textarea],
  selector: 'app-kpi-form-modal',
  templateUrl: './kpi-form-modal.html',
})
export class KpiFormModal {
  private catalogoService = inject(CatalogoKpiService);
  private kpiService = inject(KpiService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;

  open = input(false);
  plan = input.required<PlanEstrategico>();
  objetivos = input<ObjetivoEstrategico[]>([]);
  kpi = input<Kpi | null>(null);
  closed = output<void>();
  saved = output<Kpi>();

  readonly LucideCheck = LucideCheck;
  readonly LucideLock = LucideLock;
  readonly LucidePlus = LucidePlus;

  readonly nombre = signal('');
  readonly formula = signal('');
  readonly objetivoId = signal('');
  readonly frecuenciaId = signal('');
  readonly unidadId = signal('');
  readonly filas = signal<MetaAnualForm[]>([]);
  readonly frecuencias = signal<Frecuencia[]>([]);
  readonly unidades = signal<UnidadMedida[]>([]);
  readonly cargandoCatalogos = signal(false);
  readonly guardando = signal(false);
  readonly errores = signal<ErroresGeneralesForm>({});
  readonly erroresMetas = signal<ErroresFilasMetas>({ porAnio: {}, general: null });
  readonly errorGeneral = signal<string | null>(null);

  readonly modoSoloLectura = computed(() => this.plan().estadoCodigo !== 'BORRADOR');
  readonly modoEdicion = computed(
    () => this.kpi() !== null && this.plan().estadoCodigo === 'BORRADOR',
  );
  readonly titulo = computed(() => {
    if (!this.kpi()) return 'Nuevo KPI';
    return this.modoEdicion() ? 'Editar KPI' : 'Ver KPI';
  });
  readonly objetivosDisponibles = computed(() => {
    const kpiObjetivoId = this.kpi()?.objetivoId;
    return this.objetivos().filter(
      (objetivo) => objetivo.estadoCodigo !== 'CANCELADO' || objetivo.id === kpiObjetivoId,
    );
  });
  readonly opcionesObjetivo = computed<SelectOption[]>(() =>
    this.objetivosDisponibles().map((objetivo) => ({
      value: String(objetivo.id),
      label: `${objetivo.codigo} · ${objetivo.nombre}`,
    })),
  );
  readonly opcionesFrecuencia = computed<SelectOption[]>(() =>
    [...this.frecuencias()]
      .sort((a, b) => a.orden - b.orden)
      .map((frecuencia) => ({ value: String(frecuencia.id), label: frecuencia.nombre })),
  );
  readonly opcionesUnidad = computed<SelectOption[]>(() =>
    this.unidades().map((unidad) => ({
      value: String(unidad.id),
      label: unidad.simbolo ? `${unidad.nombre} (${unidad.simbolo})` : unidad.nombre,
    })),
  );
  readonly opcionesOperador: SelectOption[] = [
    { value: '>=', label: '≥' },
    { value: '<=', label: '≤' },
  ];
  readonly objetivoSeleccionado = computed(
    () => this.objetivos().find((objetivo) => objetivo.id === Number(this.objetivoId())) ?? null,
  );
  readonly metaFinal = computed(() => this.filas().at(-1)?.meta ?? '');
  readonly metaFinalFormateada = computed(() => {
    const meta = Number(this.metaFinal());
    const simbolo = this.unidades().find(
      (unidad) => unidad.id === Number(this.unidadId()),
    )?.simbolo;
    return this.metaFinal().trim() && Number.isFinite(meta)
      ? formatearValor(meta, simbolo ?? '')
      : 'Sin definir';
  });

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.inicializarFormulario();
        this.cargarCatalogos();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  actualizarMeta(anio: number, campo: 'meta' | 'valorAmarillo', valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.anio === anio ? { ...fila, [campo]: valor } : fila)),
    );
  }

  actualizarOperador(valor: string): void {
    if (valor !== '>=' && valor !== '<=') return;
    this.filas.update((filas) => filas.map((fila) => ({ ...fila, operador: valor })));
  }

  erroresDeAnio(anio: number): string[] {
    return this.erroresMetas().porAnio[anio] ?? [];
  }

  textoRojo(fila: MetaAnualForm): string {
    const amarillo = fila.valorAmarillo.trim() || 'amarillo';
    return fila.operador === '>=' ? `< ${amarillo}` : `> ${amarillo}`;
  }

  tonoPerspectiva(): BadgeTone {
    const orden = this.objetivoSeleccionado()?.perspectivaOrden;
    if (orden === 1) return 'success';
    if (orden === 2) return 'info';
    if (orden === 3) return 'warning';
    return 'neutral';
  }

  guardar(): void {
    if (this.modoSoloLectura() || this.guardando()) return;

    const form = this.formActual();
    const errores = this.validarDatosGenerales();
    const erroresMetas = validarFilasMetas(form.metas);
    this.errores.set(errores);
    this.erroresMetas.set(erroresMetas);
    this.errorGeneral.set(erroresMetas.general);

    if (
      Object.keys(errores).length > 0 ||
      Object.keys(erroresMetas.porAnio).length > 0 ||
      erroresMetas.general
    ) {
      return;
    }

    this.guardando.set(true);
    const kpiActual = this.kpi();
    const request = kpiActual
      ? this.kpiService.actualizar(kpiActual.id, form)
      : this.kpiService.crear(form);

    request
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (kpi) => {
          this.saved.emit(kpi);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
  }

  private inicializarFormulario(): void {
    const kpi = this.kpi();
    this.nombre.set(kpi?.nombre ?? '');
    this.formula.set(kpi?.formula ?? '');
    this.objetivoId.set(kpi ? String(kpi.objetivoId) : '');
    this.frecuenciaId.set(kpi ? String(kpi.frecuenciaId) : '');
    this.unidadId.set(kpi ? String(kpi.unidadId) : '');
    this.filas.set(
      kpi
        ? kpi.metas.map((meta) => ({
            anio: meta.anio,
            meta: String(meta.meta),
            operador: meta.operador,
            valorAmarillo: String(meta.valorAmarillo),
          }))
        : this.aniosDelPlan().map((anio) => ({
            anio,
            meta: '',
            operador: '>=' as const,
            valorAmarillo: '',
          })),
    );
    this.errores.set({});
    this.erroresMetas.set({ porAnio: {}, general: null });
    this.errorGeneral.set(null);
    this.guardando.set(false);
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);
    forkJoin({
      frecuencias: this.catalogoService.listarFrecuencias(),
      unidades: this.catalogoService.listarUnidades(),
    })
      .pipe(
        finalize(() => this.cargandoCatalogos.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ frecuencias, unidades }) => {
          this.frecuencias.set(frecuencias);
          this.unidades.set(unidades);
        },
        error: () => {
          this.frecuencias.set([]);
          this.unidades.set([]);
          this.errorGeneral.set('No se pudieron cargar las frecuencias y unidades de medida.');
        },
      });
  }

  private validarDatosGenerales(): ErroresGeneralesForm {
    const errores: ErroresGeneralesForm = {};
    const nombre = this.nombre().trim();
    if (!nombre) errores.nombre = 'El nombre es obligatorio.';
    else if (nombre.length > 200) errores.nombre = 'El nombre admite hasta 200 caracteres.';
    if (!this.formula().trim()) errores.formula = 'La fórmula es obligatoria.';
    if (!this.objetivoId()) errores.objetivoId = 'Seleccione un objetivo estratégico.';
    if (!this.frecuenciaId()) errores.frecuenciaId = 'Seleccione una frecuencia.';
    if (!this.unidadId()) errores.unidadId = 'Seleccione una unidad de medida.';
    return errores;
  }

  private formActual(): KpiForm {
    return {
      nombre: this.nombre(),
      formula: this.formula(),
      objetivoId: Number(this.objetivoId()),
      frecuenciaId: Number(this.frecuenciaId()),
      unidadId: Number(this.unidadId()),
      metas: this.filas(),
    };
  }

  private aniosDelPlan(): number[] {
    return Array.from(
      { length: this.plan().anioFin - this.plan().anioInicio + 1 },
      (_, indice) => this.plan().anioInicio + indice,
    );
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo guardar el KPI. Intente nuevamente.');
      return;
    }

    const apiError = error.error as Partial<KpiApiErrorDto> | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');
    const normalizado = mensaje.toLocaleLowerCase('es');

    if (error.status === 409 && normalizado.includes('nombre')) {
      this.errores.update((actuales) => ({
        ...actuales,
        nombre: 'Ya existe un KPI con este nombre en el objetivo.',
      }));
      return;
    }
    if (error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo guardar el KPI. Intente nuevamente.');
      return;
    }
    if (error.status === 400) {
      this.errorGeneral.set(mensaje || 'No se pudo guardar el KPI. Intente nuevamente.');
      return;
    }
    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para gestionar KPIs.');
      return;
    }
    this.errorGeneral.set('No se pudo guardar el KPI. Intente nuevamente.');
  }
}
