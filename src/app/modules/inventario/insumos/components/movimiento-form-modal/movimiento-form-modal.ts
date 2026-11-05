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
import { Subscription, finalize } from 'rxjs';
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
import { SolicitudInsumo } from '../../interfaces/solicitud-insumo.interface';
import { InsumoService } from '../../services/insumo.service';
import { LoteInsumoService } from '../../services/lote-insumo.service';
import { MovimientoInsumoService } from '../../services/movimiento-insumo.service';
import { SolicitudInsumoService } from '../../services/solicitud-insumo.service';
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

// Ver el comentario sobre "solicitudBuscada" mas abajo para el flujo de
// "Solicitud" (OFT0-257, pedido explicito del usuario, mismo patron que el
// campo "Pedido" de MovimientoProductoTerminadoFormModal).
@Component({
  imports: [Button, Combobox, Field, Icon, IconButton, Input, Modal, Select],
  selector: 'app-movimiento-form-modal',
  templateUrl: './movimiento-form-modal.html',
})
export class MovimientoFormModal {
  private insumoService = inject(InsumoService);
  private loteService = inject(LoteInsumoService);
  private movimientoService = inject(MovimientoInsumoService);
  private solicitudService = inject(SolicitudInsumoService);
  private destroyRef = inject(DestroyRef);
  private estabaAbierto = false;
  private siguienteFilaId = 1;
  private cargaSolicitudSub: Subscription | null = null;

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

  // Buscador de solicitudes de insumos (solo visible/usado en 'salida') —
  // mismo patron que el buscador de "Pedido" en
  // MovimientoProductoTerminadoFormModal: elegir una solicitud es una
  // SEGUNDA MANERA de registrar una salida (pedido explicito del usuario).
  // El modal NO cambia de forma, solo autocompleta "Insumo" + "Cantidad" de
  // las filas de la MISMA tabla de siempre, con las lineas EXACTAS del
  // detalle de esa solicitud (el backend exige que "items" cubra todas las
  // lineas, ni de mas ni de menos — por eso agregarFila()/quitarFila() se
  // ocultan mientras hay una solicitud elegida, ver el html). El boton sigue
  // diciendo "Registrar movimiento", pero adentro llama al mismo
  // PATCH .../estado que ya usa "Registrar entrega" en el detalle de
  // Solicitudes de insumos — confirmado por el backend que no hace falta
  // endpoint nuevo para esto (mismo criterio que Pedidos).
  solicitudBuscada = signal('');
  solicitudesEnProceso = signal<SolicitudInsumo[]>([]);
  solicitudesOptions = computed<SelectOption[]>(() =>
    this.solicitudesEnProceso().map((solicitud) => ({
      value: String(solicitud.id),
      label: solicitud.codigo,
      secondary: solicitud.solicitadoPorNombre,
    })),
  );

  solicitud = signal<SolicitudInsumo | null>(null);
  cargandoSolicitud = signal(false);

  // Mismo criterio que entregaBloqueada en SolicitudInsumoDetalleModal: no
  // se puede confirmar la entrega si la disponibilidad no es "completo".
  entregaSolicitudBloqueada = computed(() => {
    const s = this.solicitud();
    return s !== null && s.disponibilidad !== 'completo';
  });

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
        this.cargarSolicitudesEnProceso();
      }
      this.estabaAbierto = estaAbierto;
    });
  }

  cerrar(): void {
    this.closed.emit();
  }

  // Cambiar a un tipo distinto de 'salida' limpia cualquier solicitud
  // elegida (el campo/tabla de solicitud solo existe en 'salida') — evita
  // que quede una solicitud "fantasma" elegida y que guardar() termine
  // confirmando una entrega en vez de crear el movimiento de
  // Entrada/Ajuste que se ve en pantalla (mismo hallazgo de Codex que ya
  // se corrigio para Pedidos).
  seleccionarTipoMovimiento(valor: string): void {
    this.tipoMovimiento.set(valor as TipoMovimientoInsumo);
    const habiaSolicitud =
      this.solicitud() !== null || this.cargandoSolicitud() || !!this.solicitudBuscada();
    if (valor !== 'salida' && habiaSolicitud) this.limpiarSolicitudSeleccionada();
  }

  // Elegir una solicitud carga su detalle y autocompleta "Insumo" +
  // "Cantidad" de las filas de la tabla de siempre, con las lineas EXACTAS
  // del detalle (ni de mas ni de menos) — no cierra el form, todo pasa en
  // el mismo modal, con la misma tabla.
  seleccionarSolicitud(valor: string): void {
    // Cancela cualquier GET anterior todavia en vuelo: sin esto, elegir A y
    // enseguida B (o limpiar) podia dejar que la respuesta tardia de A
    // sobreescribiera la solicitud/motivo ya resueltos para B (mismo
    // hallazgo de Codex que ya se corrigio para Pedidos).
    this.cargaSolicitudSub?.unsubscribe();
    this.solicitudBuscada.set(valor);
    this.errorGeneral.set(null);

    if (!valor) {
      this.solicitud.set(null);
      this.limpiarFilasDeSolicitud();
      this.cargandoSolicitud.set(false);
      return;
    }

    this.cargandoSolicitud.set(true);
    this.cargaSolicitudSub = this.solicitudService
      .obtener(Number(valor))
      .pipe(
        finalize(() => this.cargandoSolicitud.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (detalle) => {
          this.solicitud.set(detalle);
          this.motivoGeneral.set(`Solicitud ${detalle.codigo}`);
          const nuevasFilas = detalle.detalle.map((item) => ({
            id: item.id,
            insumoId: String(item.insumoId),
            loteId: '',
            cantidad: String(item.cantidadSolicitada),
          }));
          this.filas.set(nuevasFilas);
          // Sin esto, la columna "Lotes" (desgloseFefoDeFila) se queda
          // vacia/"insuficiente" para estos insumos hasta que algo mas
          // dispare la carga — mismo flujo que seleccionarInsumoDeFila.
          for (const fila of nuevasFilas) {
            this.cargarLotesDeInsumo(fila.insumoId);
          }
        },
        error: () => {
          this.solicitud.set(null);
          this.limpiarFilasDeSolicitud();
          this.errorGeneral.set('No se pudo cargar la solicitud. Intenta nuevamente.');
        },
      });
  }

  private limpiarSolicitudSeleccionada(): void {
    this.cargaSolicitudSub?.unsubscribe();
    this.solicitudBuscada.set('');
    this.solicitud.set(null);
    this.cargandoSolicitud.set(false);
    this.limpiarFilasDeSolicitud();
  }

  // Vuelve la tabla a una sola fila vacia, igual que al abrir el form — se
  // usa al limpiar la solicitud elegida (manualmente o al cambiar de tipo
  // de movimiento) para no dejar las filas que trajo esa solicitud.
  private limpiarFilasDeSolicitud(): void {
    this.filas.set([filaMovimientoVacia(this.siguienteFilaId++)]);
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

  // Lotes que de verdad se pueden mover: excluye los vencidos y los
  // agotados (sin stock) en 'entrada'/'salida' (no tiene sentido sumarle
  // stock a algo vencido, ni despacharlo — el backend hace lo mismo del
  // lado de salida, confirmado). En 'ajuste' NO se excluyen: ahi el
  // objetivo es que el sistema refleje la realidad fisica del lote, este
  // vencido o agotado o no (confirmado con el usuario).
  lotesSeleccionablesDeFila(fila: FilaMovimientoInsumoForm): LoteInsumo[] {
    const lotes = this.lotesDeFila(fila);
    if (this.tipoMovimiento() === 'ajuste') return lotes;
    return lotes.filter((lote) => lote.estado !== 'vencido' && lote.cantidadActual > 0);
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
    if (this.solicitud()) {
      this.guardarSolicitud();
      return;
    }

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

  // Segunda manera de registrar una salida: confirma la entrega de la
  // solicitud elegida (PATCH .../estado con items), igual que "Registrar
  // entrega" en el detalle de Solicitudes de insumos — no pasa por
  // movimientoService, ese endpoint generico no sabe nada de solicitudes.
  private guardarSolicitud(): void {
    const solicitud = this.solicitud();
    if (
      !solicitud ||
      this.guardando() ||
      this.cargandoSolicitud() ||
      this.entregaSolicitudBloqueada()
    ) {
      return;
    }

    this.errorGeneral.set(null);
    this.guardando.set(true);

    // Las filas se crearon con id = detalle.id de la solicitud (ver
    // seleccionarSolicitud) — se matchean por ahi para mandar la cantidad
    // que de verdad quedo en la tabla (la persona pudo haberla editado).
    // El backend exige que "items" cubra EXACTAMENTE todas las lineas del
    // detalle, por eso se recorre solicitud.detalle (no filas()) para
    // armar el array.
    const cantidadPorId = new Map(this.filas().map((fila) => [fila.id, fila.cantidad]));
    const items = solicitud.detalle.map((d) => {
      const texto = cantidadPorId.get(d.id);
      const cantidadEntregada =
        texto !== undefined && texto !== '' ? Number(texto) : d.cantidadSolicitada;
      return { insumoId: d.insumoId, cantidadEntregada };
    });

    this.solicitudService
      .cambiarEstado(solicitud.id, 'entregado', items)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.saved.emit([]);
          this.closed.emit();
        },
        error: (error: unknown) => this.manejarErrorSolicitud(error),
      });
  }

  private manejarErrorSolicitud(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorGeneral.set('No se pudo registrar la entrega. Intenta nuevamente.');
      return;
    }

    if (error.status === 401 || error.status === 403) {
      this.errorGeneral.set('No tiene permisos para confirmar la entrega de esta solicitud.');
      return;
    }

    // 409 aca significa stock insuficiente en alguna linea (no se registra
    // nada) — mismo criterio que solicitud-insumo-detalle-modal.
    this.errorGeneral.set(
      error.status === 409
        ? 'No hay stock suficiente para alguna línea. Ajusta las cantidades e intenta de nuevo.'
        : error.status === 400
          ? 'Las cantidades enviadas no coinciden con los insumos de la solicitud.'
          : 'No se pudo registrar la entrega. Intenta nuevamente.',
    );
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

  // Limite alto por el mismo motivo que cargarInsumos() — el combobox
  // filtra en vivo sobre esta lista, no hay busqueda contra el backend.
  private cargarSolicitudesEnProceso(): void {
    this.solicitudService
      .listar(1, 100, { estado: 'en_proceso' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => this.solicitudesEnProceso.set(pagina.solicitudes),
        error: () => this.solicitudesEnProceso.set([]),
      });
  }

  private cargarLotesDeInsumo(insumoId: string): void {
    if (this.lotesPorInsumo()[insumoId] || this.cargandoLotesDe().has(insumoId)) return;

    this.cargandoLotesDe.update((set) => new Set(set).add(insumoId));
    // Sin "estado" en el filtro a proposito: ese param es "estricto" (solo
    // "lejos de vencer"), pensado para pantallas de filtro tipo "mostrame
    // solo los X" — excluiria los "por_vencer", que igual son stock
    // utilizable para un movimiento (confirmado por el backend, bug
    // reportado). Se filtran vencido/agotado del lado del front en
    // lotesSeleccionablesDeFila().
    this.loteService
      .listar(1, 100, { insumoId: Number(insumoId), activo: true })
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
    // Reseteo directo de la solicitud (sin pasar por
    // limpiarSolicitudSeleccionada, que tambien reescribe filas() — aca
    // abajo se arma filas() una sola vez, con el insumo preseleccionado si
    // corresponde).
    this.cargaSolicitudSub?.unsubscribe();
    this.solicitudBuscada.set('');
    this.solicitud.set(null);
    this.cargandoSolicitud.set(false);
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
