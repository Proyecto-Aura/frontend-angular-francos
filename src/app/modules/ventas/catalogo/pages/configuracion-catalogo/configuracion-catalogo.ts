import {
  Component,
  OnInit,
  TemplateRef,
  Type,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { finalize } from 'rxjs';
import {
  LucideBan,
  LucideBox,
  LucideCircleAlert,
  LucidePencil,
  LucidePlus,
  LucideRotateCcw,
  LucideTags,
  LucideTriangleAlert,
} from '@lucide/angular';

import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Field } from '../../../../../shared/ds/field/field';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { DsTab, Tabs } from '../../../../../shared/ds/tabs/tabs';
import { Textarea } from '../../../../../shared/ds/textarea/textarea';
import { CfgFormModel, CfgTab, RegistroCfg, nf } from '../../interfaces/producto.interface';
import { AvisoBanner } from '../../components/aviso-banner/aviso-banner';
import { CatalogoService } from '../../services/catalogo.service';
import { mensajeDeError } from '../../utils/error-api';
import { ConfiguracionCatalogoService } from '../../services/configuracion-catalogo.service';

interface RowCtx {
  $implicit: RegistroCfg;
  index: number;
}

interface TabInfo {
  id: CfgTab;
  label: string;
  singular: string;
  placeholderBuscar: string;
  placeholderNombre: string;
  accion: string;
}

const TABS: TabInfo[] = [
  {
    id: 'categorias',
    label: 'Categorías',
    singular: 'categoría',
    placeholderBuscar: 'Nombre de categoría…',
    placeholderNombre: 'Ej. Panadería',
    accion: 'Agregar categoría',
  },
  {
    id: 'presentaciones',
    label: 'Presentaciones',
    singular: 'presentación',
    placeholderBuscar: 'Nombre de presentación…',
    placeholderNombre: 'Ej. Caja 900 g',
    accion: 'Agregar presentación',
  },
];

@Component({
  imports: [
    AvisoBanner,
    Badge,
    Button,
    DataTable,
    Field,
    FilterBar,
    Icon,
    IconButton,
    Input,
    Modal,
    Select,
    Tabs,
    Textarea,
  ],
  selector: 'app-configuracion-catalogo',
  templateUrl: './configuracion-catalogo.html',
})
export class ConfiguracionCatalogo implements OnInit {
  private catalogo = inject(CatalogoService);
  private catalogoService = inject(ConfiguracionCatalogoService);

  ngOnInit(): void {
    if (!this.catalogo.productos().length) this.catalogo.cargar();
    this.catalogoService.cargarCategorias();
  }

  @ViewChild('nombreCell', { static: true }) nombreCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('descripcionCell', { static: true }) descripcionCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('usosCell', { static: true }) usosCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<RowCtx>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<RowCtx>;

  readonly LucidePlus = LucidePlus;
  readonly LucidePencil = LucidePencil;
  readonly LucideBan = LucideBan;
  readonly LucideRotateCcw = LucideRotateCcw;
  readonly LucideTriangleAlert = LucideTriangleAlert;
  readonly LucideCircleAlert = LucideCircleAlert;

  protected readonly tabs = TABS;
  protected readonly nf = nf;

  protected tab = signal<CfgTab>('categorias');
  protected query = signal('');
  protected estadoFiltro = signal('');
  protected aviso = signal('');
  protected avisoTono = signal<'ok' | 'error'>('ok');
  protected guardando = signal(false);
  protected errorApi = signal('');
  protected cargandoCategorias = this.catalogoService.cargandoCategorias;
  protected errorCategorias = this.catalogoService.errorCategorias;

  protected readonly estadoOptions: SelectOption[] = [
    { value: 'Activo', label: 'Activo' },
    { value: 'Inactivo', label: 'Inactivo' },
  ];

  protected tabActual = computed(() => TABS.find((t) => t.id === this.tab()) ?? TABS[0]);

  protected todas = computed<RegistroCfg[]>(() => {
    // Lee los signals para que el computed se actualice con cada cambio.
    return this.tab() === 'categorias'
      ? this.catalogoService.categoriasCfg()
      : this.catalogoService.presentacionesCfg();
  });

  protected filas = computed(() => {
    const q = this.query().trim().toLowerCase();
    const estado = this.estadoFiltro();
    return this.todas().filter(
      (x) => (!q || x.nombre.toLowerCase().includes(q)) && (!estado || x.estado === estado),
    );
  });

  protected tabsDs = computed<DsTab[]>(() => {
    const iconos: Record<CfgTab, Type<unknown>> = {
      categorias: LucideTags as Type<unknown>,
      presentaciones: LucideBox as Type<unknown>,
    };
    return TABS.map((t) => ({
      id: t.id,
      label: t.label,
      icon: iconos[t.id],
      count: this.conteo(t.id),
    }));
  });

  protected conteo(tab: CfgTab): number {
    return tab === 'categorias'
      ? this.catalogoService.categoriasCfg().length
      : this.catalogoService.presentacionesCfg().length;
  }

  protected subtitulo = computed(
    () =>
      `${this.filas().length} de ${this.todas().length} ${this.todas().length === 1 ? 'registro' : 'registros'} · los inactivos se conservan en los productos existentes`,
  );

  protected columns = computed<DsColumn[]>(() => {
    const usos: DsColumn = {
      key: 'usos',
      header: 'Productos asociados',
      width: '184px',
      align: 'right',
      cellTemplate: this.usosCellTpl,
    };
    const estado: DsColumn = {
      key: 'estado',
      header: 'Estado',
      width: '124px',
      cellTemplate: this.estadoCellTpl,
    };
    const acciones: DsColumn = {
      key: 'acciones',
      header: 'Acciones',
      width: '224px',
      align: 'right',
      cellTemplate: this.accionesCellTpl,
    };
    const nombre: DsColumn = { key: 'nombre', header: 'Nombre', cellTemplate: this.nombreCellTpl };
    return [
      nombre,
      { key: 'descripcion', header: 'Descripción', cellTemplate: this.descripcionCellTpl },
      usos,
      estado,
      acciones,
    ];
  });

  protected usosDe(reg: RegistroCfg): number {
    return this.catalogoService.usosDe(this.tab(), reg);
  }

  protected descripcionDe(reg: RegistroCfg): string {
    return reg.descripcion;
  }

  protected cambiarTab(id: string) {
    this.tab.set(id as CfgTab);
    this.confirmaId.set(null);
  }

  // --- Alta / edición ---
  protected modo = signal<'nuevo' | 'editar' | null>(null);
  protected selId = signal<number | null>(null);
  protected cf = signal<CfgFormModel>({ nombre: '', descripcion: '' });
  protected errores = signal<string[]>([]);

  private mostrarAviso(mensaje: string, tono: 'ok' | 'error' = 'ok') {
    this.aviso.set(mensaje);
    this.avisoTono.set(tono);
  }

  protected cargarCategorias() {
    this.catalogoService.cargarCategorias();
  }

  protected nuevo() {
    this.selId.set(null);
    this.cf.set({ nombre: '', descripcion: '' });
    this.errores.set([]);
    this.errorApi.set('');
    this.modo.set('nuevo');
  }

  protected editar(reg: RegistroCfg) {
    this.selId.set(reg.id);
    this.cf.set({ nombre: reg.nombre, descripcion: reg.descripcion });
    this.errores.set([]);
    this.errorApi.set('');
    this.modo.set('editar');
  }

  protected cerrarForm() {
    this.modo.set(null);
    this.selId.set(null);
    this.errores.set([]);
    this.errorApi.set('');
  }

  protected setCampo(campo: keyof CfgFormModel, valor: string) {
    this.cf.update((f) => ({ ...f, [campo]: valor }));
  }

  protected guardar() {
    const err = this.catalogoService.validarCfg(this.tab(), this.selId(), this.cf());
    if (err.length) {
      this.errores.set(err);
      return;
    }
    this.errores.set([]);
    this.errorApi.set('');
    this.guardando.set(true);
    this.catalogoService
      .guardarCfg(this.tab(), this.selId(), this.cf())
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (mensaje) => {
          this.mostrarAviso(mensaje);
          this.cerrarForm();
        },
        error: (e: unknown) =>
          this.errorApi.set(mensajeDeError(e, 'No se pudo guardar. Inténtalo de nuevo.')),
      });
  }

  // --- Desactivar (con confirmación) / Reactivar (directo) ---
  protected confirmaId = signal<number | null>(null);

  protected regConfirma = computed(() => {
    const id = this.confirmaId();
    return id === null ? null : (this.todas().find((x) => x.id === id) ?? null);
  });

  protected textoConfirma = computed(() => {
    const reg = this.regConfirma();
    if (!reg) return '';
    const n = this.usosDe(reg);
    return n > 0
      ? `Hay ${n} producto(s) asociados, por eso el registro no se elimina: se desactiva y deja de aparecer en nuevos productos, pero se mantiene visible en los que ya lo usan.`
      : 'El registro se desactiva y deja de aparecer en nuevos productos. Puede reactivarse en cualquier momento.';
  });

  protected pedirDesactivar(reg: RegistroCfg) {
    this.confirmaId.set(reg.id);
  }

  protected cancelarDesactivar() {
    this.confirmaId.set(null);
  }

  protected alternar(reg: RegistroCfg) {
    this.guardando.set(true);
    this.catalogoService
      .alternarCfg(this.tab(), reg.id)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (mensaje) => this.mostrarAviso(mensaje),
        error: (e: unknown) =>
          this.mostrarAviso(mensajeDeError(e, 'No se pudo cambiar el estado.'), 'error'),
      });
    this.confirmaId.set(null);
  }
}
