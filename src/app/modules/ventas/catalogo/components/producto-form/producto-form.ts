import {
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Alert, AlertTone } from '../../../../../shared/ds/alert/alert';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Switch } from '../../../../../shared/ds/switch/switch';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';

const DEMORA_AUTOCIERRE_TOAST_MS = 4500;
import {
  PresentacionForm,
  Producto,
  ProductoFormModel,
  ResultadoGuardado,
  formDesdeProducto,
  presentacionVacia,
  productoFormVacio,
  validarProducto,
} from '../../interfaces/producto.interface';
import { CatalogoService } from '../../services/catalogo.service';
import { mensajeDeError } from '../../utils/error-api';

@Component({
  imports: [Alert, Button, Field, Icon, IconButton, Input, Modal, Select, Switch, Textarea],
  selector: 'app-producto-form',
  templateUrl: './producto-form.html',
})
export class ProductoForm implements OnDestroy {
  private catalogoService = inject(CatalogoService);
  private destroyRef = inject(DestroyRef);

  /** null = cerrado. */
  modo = input<'nuevo' | 'editar' | null>(null);
  /** Producto a editar (solo con modo = 'editar'). */
  producto = input<Producto | null>(null);
  /** Edición desde una tarjeta: conserva los datos generales del producto. */
  soloPresentacion = input(false);

  closed = output<void>();
  /** Emite el aviso a mostrar en la pantalla que abrió el formulario. */
  guardado = output<ResultadoGuardado>();

  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;

  protected pf = signal<ProductoFormModel>(productoFormVacio(''));
  protected guardando = signal(false);

  // Alerta dentro del propio modal: campos sin completar o error de la API (el formulario sigue abierto).
  protected toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private mostrarToast(tone: AlertTone, title: string, description?: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast.set({ tone, title, description });
    this.toastTimer = setTimeout(() => this.toast.set(null), DEMORA_AUTOCIERRE_TOAST_MS);
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  constructor() {
    // Al abrir (nuevo / editar) se carga el formulario correspondiente.
    effect(() => {
      const modo = this.modo();
      const producto = this.producto();
      untracked(() => {
        if (!modo) return;
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toast.set(null);
        this.guardando.set(false);
        this.pf.set(
          modo === 'editar' && producto
            ? formDesdeProducto(producto)
            : productoFormVacio(this.categoriaPorDefecto()),
        );
      });
    });
  }

  private categoriaPorDefecto(): string {
    const activa = this.catalogoService.categoriaOpciones().find((c) => c.activa);
    return activa ? String(activa.id) : '';
  }

  /** Categorías activas + la actual del producto si quedó inactiva (se mantiene visible, como el diseño). */
  protected categoriaOptions = computed<SelectOption[]>(() =>
    this.catalogoService
      .categoriaOpciones()
      .filter((c) => c.activa || String(c.id) === this.pf().categoriaId)
      .map((c) => ({
        value: String(c.id),
        label: c.nombre + (c.activa ? '' : ' (inactiva)'),
      })),
  );

  protected presentacionOptions(actual: string): SelectOption[] {
    return [{ value: '', label: 'Seleccionar presentación' }].concat(
      this.catalogoService
        .presentacionOpciones()
        .filter((x) => x.activa || String(x.id) === actual)
        .map((x) => ({
          value: String(x.id),
          label: x.nombre + (x.activa ? '' : ' (inactiva)'),
        })),
    );
  }

  protected titulo = computed(() =>
    this.modo() === 'editar'
      ? this.soloPresentacion()
        ? 'Editar presentación'
        : 'Editar producto'
      : 'Registrar producto',
  );

  protected nota = computed(() =>
    this.modo() === 'editar'
      ? 'El SKU y el slug se conservan; el producto terminado asociado no se vuelve a crear.'
      : 'Al guardar se genera el SKU FR-P{productoID}-PR{presentacionID}, se crea un producto terminado por presentación (stock actual 0, stock mínimo 1) y las presentaciones quedan Desactivadas hasta que las actives (así se ven en el Portal B).',
  );

  protected skuDePresentacion(p: PresentacionForm): string {
    return p.sku ?? 'SKU asignado automáticamente al guardar';
  }

  /** Una presentación ya registrada no se quita desde aquí (se desactiva desde el listado). */
  protected puedeQuitar(p: PresentacionForm): boolean {
    return p.productoPresentacionId === null && this.pf().presentaciones.length > 1;
  }

  // --- Cambios de campos (inmutables, patrón signals) ---
  protected setCampo<K extends 'nombre' | 'categoriaId' | 'descripcion'>(campo: K, valor: string) {
    this.pf.update((f) => ({ ...f, [campo]: valor }));
  }

  protected setDestacado(valor: boolean) {
    this.pf.update((f) => ({ ...f, destacado: valor }));
  }

  protected setPres<K extends keyof PresentacionForm>(
    idx: number,
    campo: K,
    valor: PresentacionForm[K],
  ) {
    this.pf.update((f) => ({
      ...f,
      presentaciones: f.presentaciones.map((p, i) => (i === idx ? { ...p, [campo]: valor } : p)),
    }));
  }

  /** Guarda el archivo elegido; se sube a la API cuando se guarda el producto. */
  protected elegirImagen(idx: number, evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.setPres(idx, 'imagenArchivo', input.files?.[0] ?? null);
  }

  protected tamano(archivo: File): string {
    const kb = archivo.size / 1024;
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.ceil(kb)} KB`;
  }

  protected agregarPres() {
    if (this.soloPresentacion()) return;
    this.pf.update((f) => ({ ...f, presentaciones: [...f.presentaciones, presentacionVacia()] }));
  }

  protected quitarPres(idx: number) {
    this.pf.update((f) => ({ ...f, presentaciones: f.presentaciones.filter((_, i) => i !== idx) }));
  }

  protected guardar() {
    if (this.guardando()) return;

    const pf = this.pf();
    const err = validarProducto(pf);

    if (err.length) {
      this.mostrarToast('warning', 'Faltan campos por completar', `Revisa: ${err.join(', ')}.`);
      return;
    }

    const prod = this.producto();
    const peticion =
      this.modo() === 'editar' && prod
        ? this.soloPresentacion()
          ? this.catalogoService.actualizarPresentacion(prod.id, pf.presentaciones[0], prod.nombre)
          : this.catalogoService.actualizar(prod.id, pf)
        : this.catalogoService.registrar(pf);

    this.guardando.set(true);
    peticion
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (resultado) => {
          this.guardado.emit(resultado);
          this.closed.emit();
        },
        error: (error: unknown) =>
          this.mostrarToast(
            'error',
            mensajeDeError(error, 'No se pudo guardar el producto. Intente nuevamente.'),
          ),
      });
  }

  protected cerrar() {
    this.closed.emit();
  }
}
