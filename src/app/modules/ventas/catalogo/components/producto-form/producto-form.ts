import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  LucideCheck,
  LucideCircleAlert,
  LucideImage,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';

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
  UNIDAD,
  formDesdeProducto,
  pesoImagen,
  presentacionVacia,
  productoFormVacio,
  skuDe,
  validarProducto,
} from '../../interfaces/producto.interface';
import { CatalogoService } from '../../services/catalogo.service';

@Component({
  imports: [Button, Field, Icon, IconButton, Input, Modal, Select, Switch, Textarea],
  selector: 'app-producto-form',
  templateUrl: './producto-form.html',
})
export class ProductoForm {
  private catalogoService = inject(CatalogoService);

  /** null = cerrado. */
  modo = input<'nuevo' | 'editar' | null>(null);
  /** Producto a editar (solo con modo = 'editar'). */
  producto = input<Producto | null>(null);

  closed = output<void>();
  /** Emite el aviso a mostrar en la pantalla que abrió el formulario. */
  guardado = output<string>();

  readonly LucidePlus = LucidePlus;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideImage = LucideImage;
  readonly LucideCheck = LucideCheck;
  readonly LucideCircleAlert = LucideCircleAlert;
  protected readonly unidad = UNIDAD;

  protected pf = signal<ProductoFormModel>(productoFormVacio(''));
  protected errores = signal<string[]>([]);

  constructor() {
    // Al abrir (nuevo / editar) se carga el formulario correspondiente.
    effect(() => {
      const modo = this.modo();
      const producto = this.producto();
      untracked(() => {
        if (!modo) return;
        this.errores.set([]);
        this.pf.set(
          modo === 'editar' && producto
            ? formDesdeProducto(producto)
            : productoFormVacio(this.categoriaPorDefecto()),
        );
      });
    });
  }

  private categoriaPorDefecto(): string {
    return this.catalogoService.categoriasCfg().find((c) => c.estado === 'Activo')?.nombre ?? '';
  }

  /** Categorías activas + la actual del producto si quedó inactiva (se mantiene visible, como el diseño). */
  protected categoriaOptions = computed<SelectOption[]>(() =>
    this.catalogoService
      .categoriasCfg()
      .filter((c) => c.estado === 'Activo' || c.nombre === this.pf().categoria)
      .map((c) => ({
        value: c.nombre,
        label: c.nombre + (c.estado === 'Activo' ? '' : ' (inactiva)'),
      })),
  );

  protected presentacionOptions(actual: string): SelectOption[] {
    const cfg = this.catalogoService.presentacionesCfg();
    return [{ value: '', label: 'Seleccionar presentación' }].concat(
      cfg
        .filter((x) => x.estado === 'Activo' || x.nombre === actual)
        .map((x) => ({
          value: x.nombre,
          label: x.nombre + (x.estado === 'Activo' ? '' : ' (inactiva)'),
        })),
    );
  }

  protected titulo = computed(() =>
    this.modo() === 'editar' ? 'Editar producto' : 'Registrar producto',
  );

  protected nota = computed(() =>
    this.modo() === 'editar'
      ? 'El SKU y el slug se conservan; el producto terminado asociado no se vuelve a crear.'
      : `Al guardar se genera el SKU FR-P{productoID}-PR{presentacionID}, se crea un producto terminado por presentación (cantidad 0, stock actual 0, stock mínimo 1, unidad ${UNIDAD}) y la visibilidad en Portal B inicia desactivada.`,
  );

  protected skuDePresentacion(p: PresentacionForm): string {
    const prod = this.producto();
    return this.modo() === 'editar' && prod && p.id
      ? skuDe(prod.id, p.id)
      : 'SKU asignado automáticamente al guardar';
  }

  // --- Cambios de campos (inmutables, patrón signals) ---
  protected setCampo<K extends 'nombre' | 'categoria' | 'descripcion'>(campo: K, valor: string) {
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

  /** Simula el adjunto igual que el diseño: nombre derivado del producto. */
  // TODO(backend): subir el archivo real (JPG/PNG, máx. 2 MB) y guardar la URL devuelta.
  protected adjuntar(idx: number) {
    const base = (this.pf().nombre || 'producto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    this.setPres(idx, 'imagen', `${base}-${idx + 1}.jpg`);
  }

  protected extension(imagen: string): string {
    return (imagen.split('.').pop() || 'jpg').toUpperCase();
  }

  protected peso(imagen: string): string {
    return pesoImagen(imagen);
  }

  protected guardar() {
    const pf = this.pf();
    const err = validarProducto(pf);
    if (err.length) {
      this.errores.set(err);
      return;
    }
    const prod = this.producto();
    const aviso =
      this.modo() === 'editar' && prod
        ? this.catalogoService.actualizar(prod.id, pf)
        : this.catalogoService.registrar(pf);
    this.guardado.emit(aviso);
    this.closed.emit();
  }

  protected cerrar() {
    this.closed.emit();
  }
}
