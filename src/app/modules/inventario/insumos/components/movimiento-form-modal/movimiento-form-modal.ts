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
import { LucideArrowLeftRight, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { Button } from '../../../../../shared/ds/button/button';
import { Combobox } from '../../../../../shared/ds/combobox/combobox';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Insumo } from '../../interfaces/insumo.interface';
import { LoteInsumo } from '../../interfaces/lote-insumo.interface';
import {
  FilaMovimientoInsumoForm,
  MovimientoInsumoForm,
  TipoMovimientoInsumo,
  filaMovimientoVacia,
} from '../../interfaces/movimiento-insumo.interface';
import { InsumoService } from '../../services/insumo.service';
import { LoteInsumoService } from '../../services/lote-insumo.service';
import { MovimientoFormErrores, validarMovimientoForm } from './movimiento-form.validaciones';

const TIPOS_MOVIMIENTO: SelectOption[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
];

export interface DesgloseFefo {
  lineas: string[];
  cargando: boolean;
  insuficiente: boolean;
}

@Component({
  imports: [Button, Combobox, Field, Icon, IconButton, Input, Modal, Select],
  selector: 'app-movimiento-form-modal',
  templateUrl: './movimiento-form-modal.html',
})
export class MovimientoFormModal {
  private insumoService = inject(InsumoService);
  private loteService = inject(LoteInsumoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private siguienteFilaId = 1;

  open = input(false);
  closed = output<void>();
  // TODO(backend): por ahora solo valida en el frontend y emite el payload
  // armado. El backend ya definio los 3 endpoints
  // (POST /movimientos-insumo/entrada|salida|ajuste) — falta que guardar()
  // llame al servicio real en vez de solo emitir este evento, manejando el
  // envio de varias filas (una llamada por fila) y sus posibles fallos
  // parciales.
  registrado = output<MovimientoInsumoForm>();

  readonly LucideArrowLeftRight = LucideArrowLeftRight;
  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;
  readonly tiposMovimiento = TIPOS_MOVIMIENTO;

  tipoMovimiento = signal<TipoMovimientoInsumo>('entrada');
  motivoGeneral = signal('');
  filas = signal<FilaMovimientoInsumoForm[]>([]);

  insumos = signal<Insumo[]>([]);
  insumosOptions = computed<SelectOption[]>(() =>
    this.insumos().map((insumo) => ({
      value: String(insumo.id),
      label: `${insumo.sku} · ${insumo.nombre}`,
    })),
  );

  // Lotes activos por insumo, cacheados por insumoId (string, igual que
  // Insumo.id en el resto del formulario) para no repetir el fetch si dos
  // filas eligen el mismo insumo. Hacen falta en ambos tipos: en 'entrada'
  // llenan el <select> de lote, en 'salida' alimentan la simulacion FEFO de
  // abajo (ver desgloseFefoDeFila). El backend ya los devuelve ordenados
  // por fecha_vencimiento ascendente (nulls last), asi que no hay que
  // volver a ordenarlos aca.
  private lotesPorInsumo = signal<Record<string, LoteInsumo[]>>({});
  private cargandoLotesDe = signal<Set<string>>(new Set());

  cantidadInsumosEnMovimiento = computed(() => this.filas().filter((fila) => fila.insumoId).length);

  errores = signal<MovimientoFormErrores>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);

  constructor() {
    effect(() => {
      const estaAbierto = this.open();
      if (estaAbierto && !this.estabaAbierto) {
        this.inicializarFormulario();
        this.cargarInsumos();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  seleccionarTipoMovimiento(valor: string): void {
    this.tipoMovimiento.set(valor as TipoMovimientoInsumo);
  }

  agregarFila(): void {
    this.filas.update((filas) => [...filas, filaMovimientoVacia(this.siguienteFilaId++)]);
  }

  quitarFila(id: number): void {
    this.filas.update((filas) => filas.filter((fila) => fila.id !== id));
  }

  seleccionarInsumoDeFila(id: number, valor: string): void {
    // Cambiar de insumo invalida el lote que tuviera elegido esa fila (era
    // de otro insumo).
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, insumoId: valor, loteId: '' } : fila)),
    );
    if (valor) this.cargarLotesDeInsumo(valor);
  }

  seleccionarLoteDeFila(id: number, valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, loteId: valor } : fila)),
    );
  }

  actualizarCantidadDeFila(id: number, valor: string): void {
    this.filas.update((filas) =>
      filas.map((fila) => (fila.id === id ? { ...fila, cantidad: valor } : fila)),
    );
  }

  insumoDeFila(fila: FilaMovimientoInsumoForm): Insumo | null {
    return this.insumos().find((insumo) => String(insumo.id) === fila.insumoId) ?? null;
  }

  stockActualDeFila(fila: FilaMovimientoInsumoForm): string {
    const insumo = this.insumoDeFila(fila);
    return insumo ? `${insumo.stockActual} ${insumo.unidadMedida}` : '—';
  }

  stockMinimoDeFila(fila: FilaMovimientoInsumoForm): string {
    const insumo = this.insumoDeFila(fila);
    return insumo ? `${insumo.stockMinimo} ${insumo.unidadMedida}` : '—';
  }

  cargandoLotesDeFila(fila: FilaMovimientoInsumoForm): boolean {
    return this.cargandoLotesDe().has(fila.insumoId);
  }

  lotesDeFila(fila: FilaMovimientoInsumoForm): LoteInsumo[] {
    return this.lotesPorInsumo()[fila.insumoId] ?? [];
  }

  // Opciones del <select> de lote en 'entrada': uno por lote activo del
  // insumo elegido en esa fila.
  loteOptionsDeFila(fila: FilaMovimientoInsumoForm): SelectOption[] {
    return this.lotesDeFila(fila).map((lote) => ({
      value: String(lote.id),
      label: `${lote.codigoLote} · vence ${lote.fechaVencimiento ?? 'sin fecha'} · ${lote.cantidadActual} disp.`,
    }));
  }

  // Simula en el front el reparto FEFO que hace el backend en 'salida':
  // resta la cantidad pedida lote por lote, en el mismo orden en que ya
  // vienen (el backend los devuelve ordenados por fecha_vencimiento
  // ascendente). Es solo una vista previa — quien decide de verdad al
  // guardar es el backend, y podria diferir si justo hay otro movimiento
  // concurrente sobre el mismo insumo.
  desgloseFefoDeFila(fila: FilaMovimientoInsumoForm): DesgloseFefo {
    const cargando = this.cargandoLotesDeFila(fila);
    const cantidad = Number(fila.cantidad);
    if (!fila.insumoId || !fila.cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
      return { lineas: [], cargando, insuficiente: false };
    }
    if (cargando) {
      return { lineas: [], cargando, insuficiente: false };
    }

    let restante = cantidad;
    const lineas: string[] = [];
    for (const lote of this.lotesDeFila(fila)) {
      if (restante <= 0) break;
      const tomar = Math.min(restante, lote.cantidadActual);
      if (tomar <= 0) continue;
      lineas.push(`${lote.codigoLote}: −${tomar}`);
      restante -= tomar;
    }

    return { lineas, cargando, insuficiente: restante > 0 };
  }

  stockResultanteDeFila(fila: FilaMovimientoInsumoForm): string {
    const insumo = this.insumoDeFila(fila);
    const cantidad = Number(fila.cantidad);
    if (!insumo || !fila.cantidad || Number.isNaN(cantidad)) return '—';

    const resultante =
      this.tipoMovimiento() === 'entrada'
        ? insumo.stockActual + cantidad
        : insumo.stockActual - cantidad;
    return `${resultante} ${insumo.unidadMedida}`;
  }

  errorDeFila(id: number, campo: 'insumoId' | 'loteId' | 'cantidad'): string | null {
    return this.errores().porFila?.[id]?.[campo] ?? null;
  }

  guardar(): void {
    const form = this.formActual();
    const errores = validarMovimientoForm(form);

    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) return;

    this.registrado.emit(form);
    this.closed.emit();
  }

  private cargarInsumos(): void {
    // Limite alto para traer el catalogo completo de insumos activos en una
    // sola pagina — igual criterio que lote-form-modal.
    this.insumoService
      .listar(1, 100, { estado: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.insumos.set(pagina.insumos),
        error: () => this.insumos.set([]),
      });
  }

  private cargarLotesDeInsumo(insumoId: string): void {
    if (this.lotesPorInsumo()[insumoId] || this.cargandoLotesDe().has(insumoId)) return;

    this.cargandoLotesDe.update((set) => new Set(set).add(insumoId));
    this.loteService
      .listar(1, 100, { insumoId: Number(insumoId), estado: 'activo', activo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.lotesPorInsumo.update((cache) => ({ ...cache, [insumoId]: pagina.lotes }));
          this.cargandoLotesDe.update((set) => {
            const copia = new Set(set);
            copia.delete(insumoId);
            return copia;
          });
        },
        error: () => {
          this.lotesPorInsumo.update((cache) => ({ ...cache, [insumoId]: [] }));
          this.cargandoLotesDe.update((set) => {
            const copia = new Set(set);
            copia.delete(insumoId);
            return copia;
          });
        },
      });
  }

  private inicializarFormulario(): void {
    this.siguienteFilaId = 1;
    this.tipoMovimiento.set('entrada');
    this.motivoGeneral.set('');
    this.filas.set([filaMovimientoVacia(this.siguienteFilaId++)]);
    this.lotesPorInsumo.set({});
    this.cargandoLotesDe.set(new Set());
    this.errores.set({});
    this.errorGeneral.set(null);
    this.guardando.set(false);
  }

  private formActual(): MovimientoInsumoForm {
    return {
      tipoMovimiento: this.tipoMovimiento(),
      motivoGeneral: this.motivoGeneral().trim(),
      filas: this.filas(),
    };
  }
}
