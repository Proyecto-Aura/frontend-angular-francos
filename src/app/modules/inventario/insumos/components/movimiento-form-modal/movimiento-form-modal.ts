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
import { LucideArrowLeftRight, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { finalize } from 'rxjs';
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
  MovimientoInsumo,
  MovimientoInsumoForm,
  TipoMovimientoInsumo,
  filaMovimientoVacia,
} from '../../interfaces/movimiento-insumo.interface';
import { InsumoService } from '../../services/insumo.service';
import { LoteInsumoService } from '../../services/lote-insumo.service';
import { MovimientoInsumoService } from '../../services/movimiento-insumo.service';
import { MovimientoFormErrores, validarMovimientoForm } from './movimiento-form.validaciones';

const TIPOS_MOVIMIENTO: SelectOption[] = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste', label: 'Ajuste' },
];

// texto va en la columna "Lotes" ("FR-LT-001: −60"), resultado va aparte en
// "Stock lote" ("0 kg") — separados en dos columnas en vez de un solo texto
// largo por linea, para que no se vea tan cargado.
export interface LineaFefo {
  texto: string;
  resultado: string;
}

export interface DesgloseFefo {
  lineas: LineaFefo[];
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
  private movimientoService = inject(MovimientoInsumoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private siguienteFilaId = 1;

  open = input(false);
  // Al abrir desde el icono "Registrar movimiento" de una fila (Stock de
  // insumos), precarga ese insumo en la primera fila del formulario — la
  // persona igual puede cambiarlo o agregar mas filas de otros insumos.
  insumoPreseleccionado = input<Insumo | null>(null);
  closed = output<void>();
  saved = output<MovimientoInsumo[]>();

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
      label: insumo.nombre,
      secondary: insumo.sku,
    })),
  );

  // Lotes activos por insumo, cacheados por insumoId (string, igual que
  // Insumo.id en el resto del formulario) para no repetir el fetch si dos
  // filas eligen el mismo insumo. Hacen falta en los 3 tipos: en
  // 'entrada'/'ajuste' llenan el combobox de lote, en 'salida' alimentan la
  // simulacion FEFO de abajo (ver desgloseFefoDeFila). El backend ya los
  // devuelve ordenados por fecha_vencimiento ascendente (nulls last), asi
  // que no hay que volver a ordenarlos aca.
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

  // En 'entrada' lo que importa vigilar es no pasarse del maximo
  // (sobre-stock); en 'salida', no bajar del minimo (quiebre) — por eso el
  // limite que se muestra cambia segun tipoMovimiento en vez de ser siempre
  // el minimo.
  stockLimiteDeFila(fila: FilaMovimientoInsumoForm): string {
    const insumo = this.insumoDeFila(fila);
    if (!insumo) return '—';
    const limite = this.tipoMovimiento() === 'entrada' ? insumo.stockMaximo : insumo.stockMinimo;
    return `${limite} ${insumo.unidadMedida}`;
  }

  cargandoLotesDeFila(fila: FilaMovimientoInsumoForm): boolean {
    return this.cargandoLotesDe().has(fila.insumoId);
  }

  lotesDeFila(fila: FilaMovimientoInsumoForm): LoteInsumo[] {
    return this.lotesPorInsumo()[fila.insumoId] ?? [];
  }

  // Lotes que de verdad se pueden mover: excluye los vencidos en
  // 'entrada'/'salida' (no tiene sentido sumarle stock a algo vencido, ni
  // despacharlo — el backend hace lo mismo del lado de salida, confirmado).
  // En 'ajuste' NO se excluyen: ahi el objetivo es que el sistema refleje la
  // realidad fisica del lote, este vencido o no (confirmado con el
  // usuario).
  lotesSeleccionablesDeFila(fila: FilaMovimientoInsumoForm): LoteInsumo[] {
    const lotes = this.lotesDeFila(fila);
    if (this.tipoMovimiento() === 'ajuste') return lotes;
    return lotes.filter((lote) => lote.estado !== 'vencido');
  }

  // Opciones del combobox de lote en 'entrada'/'ajuste': uno por lote
  // seleccionable del insumo elegido en esa fila.
  loteOptionsDeFila(fila: FilaMovimientoInsumoForm): SelectOption[] {
    return this.lotesSeleccionablesDeFila(fila).map((lote) => ({
      value: String(lote.id),
      label: lote.codigoLote,
      secondary: `${lote.cantidadActual} disp.`,
    }));
  }

  // Stock del lote elegido en 'entrada'/'ajuste' (no del insumo): "—" por
  // defecto (sin lote elegido, o en 'salida', donde loteId siempre queda
  // vacio y el detalle por lote lo da el desglose FEFO de abajo, no este
  // campo). En 'entrada' con una cantidad cargada muestra el resultado
  // (cantidadActual + cantidad). En 'ajuste', fila.cantidad YA ES el
  // resultado (la cantidad real que la persona conto), no hay nada que
  // sumar — se muestra tal cual.
  stockLoteDeFila(fila: FilaMovimientoInsumoForm): string {
    if (!fila.loteId) return '—';
    const insumo = this.insumoDeFila(fila);
    const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
    if (!insumo || !lote) return '—';

    if (this.tipoMovimiento() === 'ajuste') {
      const cantidadReal = Number(fila.cantidad);
      if (fila.cantidad === '' || Number.isNaN(cantidadReal)) {
        return `${lote.cantidadActual} ${insumo.unidadMedida}`;
      }
      return `${cantidadReal} ${insumo.unidadMedida}`;
    }

    const cantidad = Number(fila.cantidad);
    const resultante =
      lote.cantidadActual + (!fila.cantidad || Number.isNaN(cantidad) ? 0 : cantidad);
    return `${resultante} ${insumo.unidadMedida}`;
  }

  // Referencia que se muestra al lado del campo "Cantidad" en 'ajuste', para
  // que la persona vea contra que esta corrigiendo sin tener que ir a mirar
  // la opcion del combobox de nuevo.
  cantidadActualLoteDeFila(fila: FilaMovimientoInsumoForm): string {
    const insumo = this.insumoDeFila(fila);
    const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
    if (!insumo || !lote) return '—';
    return `${lote.cantidadActual} ${insumo.unidadMedida}`;
  }

  // Simula en el front el reparto FEFO que hace el backend en 'salida':
  // resta la cantidad pedida lote por lote, en el mismo orden en que ya
  // vienen (el backend los devuelve ordenados por fecha_vencimiento
  // ascendente), excluyendo vencidos — igual que ahora hace el backend de
  // verdad (antes era un hueco real: se podia despachar materia prima
  // vencida). Es solo una vista previa — quien decide de verdad al guardar
  // es el backend, y podria diferir si justo hay otro movimiento concurrente
  // sobre el mismo insumo. "texto" va en la columna "Lotes" y "resultado" en
  // "Stock lote" — misma fila visual, separados en dos columnas (no un solo
  // texto largo por linea) para que no se vea cargado.
  desgloseFefoDeFila(fila: FilaMovimientoInsumoForm): DesgloseFefo {
    const cargando = this.cargandoLotesDeFila(fila);
    const insumo = this.insumoDeFila(fila);
    const cantidad = Number(fila.cantidad);
    if (!fila.insumoId || !fila.cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
      return { lineas: [], cargando, insuficiente: false };
    }
    if (cargando) {
      return { lineas: [], cargando, insuficiente: false };
    }

    let restante = cantidad;
    const lineas: LineaFefo[] = [];
    for (const lote of this.lotesSeleccionablesDeFila(fila)) {
      if (restante <= 0) break;
      const tomar = Math.min(restante, lote.cantidadActual);
      if (tomar <= 0) continue;
      const quedan = lote.cantidadActual - tomar;
      lineas.push({
        texto: `${lote.codigoLote}: −${tomar}`,
        resultado: `${quedan} ${insumo?.unidadMedida ?? ''}`,
      });
      restante -= tomar;
    }

    return { lineas, cargando, insuficiente: restante > 0 };
  }

  // El stock del insumo es un solo pozo compartido: si dos filas mueven el
  // mismo insumo (por ej. entradas a dos lotes distintos), el resultado de
  // una fila tiene que arrastrar lo que ya movieron las filas de ARRIBA
  // (mismo insumo) — como una libreta contable leida de arriba hacia abajo,
  // no cada fila aislada. Por eso se corta en el indice de esta fila: las de
  // abajo no cuentan todavia, asi que cambiar una fila nunca mueve el
  // resultado de las que estan antes que ella, pero si el de las que vienen
  // despues. Al ser derivado de filas() (no un contador que se va
  // actualizando a mano), se recalcula solo con cualquier cambio —
  // agregar/quitar fila, tipear en cualquiera.
  stockResultanteDeFila(fila: FilaMovimientoInsumoForm): string {
    const insumo = this.insumoDeFila(fila);
    if (!insumo) return '—';

    const filas = this.filas();
    const indiceFila = filas.findIndex((f) => f.id === fila.id);
    const filasDelInsumoHastaAqui = filas
      .slice(0, indiceFila + 1)
      .filter((f) => f.insumoId === fila.insumoId);

    const contribuciones = filasDelInsumoHastaAqui
      .map((f) => this.contribucionDeFila(f))
      .filter((contribucion): contribucion is number => contribucion !== null);
    if (contribuciones.length === 0) return '—';

    const total = contribuciones.reduce((suma, contribucion) => suma + contribucion, 0);
    const resultante = insumo.stockActual + total;
    return `${resultante} ${insumo.unidadMedida}`;
  }

  // Cuanto suma o resta esta fila al stock del insumo, segun tipoMovimiento:
  // entrada suma la cantidad tal cual, salida la resta, y ajuste aporta la
  // DIFERENCIA entre la cantidad real escrita y lo que ya tenia el lote (no
  // la cantidad real en si, que no es un delta). null cuando todavia no hay
  // datos suficientes para calcularla (sin cantidad, o en ajuste sin el
  // lote resuelto).
  private contribucionDeFila(fila: FilaMovimientoInsumoForm): number | null {
    if (!fila.cantidad) return null;
    const cantidad = Number(fila.cantidad);
    if (Number.isNaN(cantidad)) return null;

    const tipo = this.tipoMovimiento();
    if (tipo === 'entrada') return cantidad;
    if (tipo === 'salida') return -cantidad;

    const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
    return lote ? cantidad - lote.cantidadActual : null;
  }

  errorDeFila(id: number, campo: 'insumoId' | 'loteId' | 'cantidad'): string | null {
    return this.errores().porFila?.[id]?.[campo] ?? null;
  }

  guardar(): void {
    const form = this.formActual();
    const errores = validarMovimientoForm(form);

    // "La cantidad no cambió" es una regla de negocio (no una validacion de
    // forma como las de validarMovimientoForm) porque necesita cruzar
    // fila.cantidad contra el stock real del lote elegido, algo que esa
    // funcion no conoce — vive aca, en el componente, que si tiene los
    // lotes cargados.
    if (form.tipoMovimiento === 'ajuste') {
      for (const fila of form.filas) {
        const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
        if (lote && fila.cantidad !== '' && Number(fila.cantidad) === lote.cantidadActual) {
          errores.porFila = {
            ...errores.porFila,
            [fila.id]: { ...errores.porFila?.[fila.id], cantidad: 'La cantidad no cambió.' },
          };
        }
      }
    }

    this.errores.set(errores);
    this.errorGeneral.set(null);

    if (Object.keys(errores).length > 0) return;

    this.guardando.set(true);
    const razon = form.motivoGeneral;
    const peticion =
      form.tipoMovimiento === 'entrada'
        ? this.movimientoService.registrarEntrada(
            form.filas.map((fila) => ({
              lote_insumo_id: Number(fila.loteId),
              cantidad: Number(fila.cantidad),
              razon,
            })),
          )
        : form.tipoMovimiento === 'ajuste'
          ? this.movimientoService.registrarAjuste(
              form.filas.map((fila) => {
                const lote = this.lotesDeFila(fila).find((l) => String(l.id) === fila.loteId);
                const cantidadReal = Number(fila.cantidad);
                return {
                  lote_insumo_id: Number(fila.loteId),
                  // El backend pide un delta con signo, no la cantidad real
                  // que tipeo la persona — se calcula aca, nunca se le pide
                  // a la persona que lo calcule a mano.
                  cantidad: lote ? cantidadReal - lote.cantidadActual : cantidadReal,
                  razon,
                };
              }),
            )
          : this.movimientoService.registrarSalida(
              form.filas.map((fila) => ({
                insumo_id: Number(fila.insumoId),
                cantidad: Number(fila.cantidad),
                razon,
              })),
            );

    peticion
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (movimientos) => {
          this.saved.emit(movimientos);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarError(error),
      });
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
    const preseleccionado = this.insumoPreseleccionado();
    const filaInicial = filaMovimientoVacia(this.siguienteFilaId++);
    this.filas.set([
      preseleccionado ? { ...filaInicial, insumoId: String(preseleccionado.id) } : filaInicial,
    ]);
    this.lotesPorInsumo.set({});
    this.cargandoLotesDe.set(new Set());
    this.errores.set({});
    this.errorGeneral.set(null);
    this.guardando.set(false);

    if (preseleccionado) this.cargarLotesDeInsumo(String(preseleccionado.id));
  }

  private formActual(): MovimientoInsumoForm {
    return {
      tipoMovimiento: this.tipoMovimiento(),
      motivoGeneral: this.motivoGeneral().trim(),
      filas: this.filas(),
    };
  }

  private manejarError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo registrar el movimiento. Intente nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para registrar movimientos.');
      return;
    }

    const apiError = error.error as { message?: string | string[] } | null;
    const mensajes = Array.isArray(apiError?.message)
      ? apiError.message
      : apiError?.message
        ? [apiError.message]
        : [];
    const mensaje = mensajes.join(' ');

    // El backend identifica la fila con problema en el propio mensaje (ej.
    // "Lote no encontrado (lote_insumo_id=99)") — se muestra tal cual, no
    // hay forma de mapearlo de vuelta a una fila puntual del form.
    if (error.status === 400 || error.status === 404 || error.status === 409) {
      this.errorGeneral.set(mensaje || 'No se pudo registrar el movimiento. Intente nuevamente.');
      return;
    }

    this.errorGeneral.set('No se pudo registrar el movimiento. Intente nuevamente.');
  }
}
