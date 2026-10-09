import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideCircleAlert, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { finalize } from 'rxjs';
import { Button } from '../../../../../shared/ds/button/button';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Switch } from '../../../../../shared/ds/switch/switch';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
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
  imports: [Button, Field, Icon, IconButton, Input, Modal, Select, Switch, Textarea],
  selector: 'app-producto-form',
  templateUrl: './producto-form.html',
})
export class ProductoForm {
  private catalogoService = inject(CatalogoService);
  private destroyRef = inject(DestroyRef);

  /** null = cerrado. */
  modo = input<'nuevo' | 'editar' | null>(null);
  /** Producto a editar (solo con modo = 'editar'). */
  producto = input<Producto | null>(null);

  closed = output<void>();
  /** Emite el aviso a mostrar en la pantalla que abrió el formulario. */
  guardado = output<ResultadoGuardado>();

  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideCircleAlert = LucideCircleAlert;

  protected pf = signal<ProductoFormModel>(productoFormVacio(''));
  protected errores = signal<string[]>([]);
  /** Mensaje de la API cuando no se pudo guardar (el formulario sigue abierto). */
  protected errorApi = signal('');
  protected guardando = signal(false);

  constructor() {
    // Al abrir (nuevo / editar) se carga el formulario correspondiente.
    effect(() => {
      const modo = this.modo();
      const producto = this.producto();
      untracked(() => {
        if (!modo) return;
        this.errores.set([]);
        this.errorApi.set('');
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
    this.modo() === 'editar' ? 'Editar producto' : 'Registrar producto',
  );

  protected nota = computed(() =>
    this.modo() === 'editar'
      ? 'El SKU y el slug se conservan; el producto terminado asociado no se vuelve a crear.'
      : 'Al guardar se genera el SKU FR-P{productoID}-PR{presentacionID}, se crea un producto terminado por presentación (stock actual 0, stock mínimo 1) y la visibilidad en Portal B inicia desactivada.',
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

  protected agregarPres() {
    this.pf.update((f) => ({ ...f, presentaciones: [...f.presentaciones, presentacionVacia()] }));
  }

  protected quitarPres(idx: number) {
    this.pf.update((f) => ({ ...f, presentaciones: f.presentaciones.filter((_, i) => i !== idx) }));
  }

  protected guardar() {
    if (this.guardando()) return;

    const pf = this.pf();
    const err = validarProducto(pf);
    this.errorApi.set('');

    if (err.length) {
      this.errores.set(err);
      return;
    }

    this.errores.set([]);
    const prod = this.producto();
    const peticion =
      this.modo() === 'editar' && prod
        ? this.catalogoService.actualizar(prod.id, pf)
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
          this.errorApi.set(
            mensajeDeError(error, 'No se pudo guardar el producto. Intente nuevamente.'),
          ),
      });
  }

  protected cerrar() {
    this.closed.emit();
  }
}
