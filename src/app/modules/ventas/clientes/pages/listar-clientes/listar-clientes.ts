import { AfterViewInit, Component, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { LucideEye, LucidePencil, LucidePlus, LucideSearch, LucideTrash2 } from '@lucide/angular';

import { Avatar } from '../../../../../shared/ds/avatar/avatar';
import { Badge, BadgeTone } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { CellStack } from '../../../../../shared/ds/cell-stack/cell-stack';
import { DataTable, DsColumn } from '../../../../../shared/ds/data-table/data-table';
import { Field } from '../../../../../shared/ds/field/field';
import { FilterBar } from '../../../../../shared/ds/filter-bar/filter-bar';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { IconButton } from '../../../../../shared/ds/icon-button/icon-button';
import { Input } from '../../../../../shared/ds/input/input';
import { Modal } from '../../../../../shared/ds/modal/modal';
import { Pagination } from '../../../../../shared/ds/pagination/pagination';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import {
  Cliente,
  ClienteFormModel,
  TipoDocumento,
  clienteFormVacio,
  limpiarPersona,
  nombreCliente,
  personaPorDocumento,
  validarCliente,
} from '../../interfaces/cliente.interface';
import { ClienteService } from '../../services/cliente.service';

const PAGE_SIZE = 8;

@Component({
  imports: [Avatar, Badge, Button, CellStack, DataTable, Field, FilterBar, Icon, IconButton, Input, Modal, Pagination, Select],
  selector: 'app-listar-clientes',
  templateUrl: './listar-clientes.html',
})
export class ListarClientes implements AfterViewInit {
  private clienteService = inject(ClienteService);

  @ViewChild('codigoCell', { static: true }) codigoCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;
  @ViewChild('clienteCell', { static: true }) clienteCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;
  @ViewChild('documentoCell', { static: true }) documentoCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;
  @ViewChild('tipoCell', { static: true }) tipoCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;
  @ViewChild('accionesCell', { static: true }) accionesCellTpl!: TemplateRef<{ $implicit: Cliente; index: number }>;

  readonly LucideSearch = LucideSearch;
  readonly LucidePlus = LucidePlus;
  readonly LucideEye = LucideEye;
  readonly LucidePencil = LucidePencil;
  readonly LucideTrash2 = LucideTrash2;

  protected readonly nombreCliente = nombreCliente;

  protected readonly tipoOptions: SelectOption[] = [
    { value: 'Mayorista', label: 'Mayorista' },
    { value: 'Minorista', label: 'Minorista' },
  ];

  protected readonly estadoOptions: SelectOption[] = [
    { value: 'Activo', label: 'Activo' },
    { value: 'Inactivo', label: 'Inactivo' },
  ];

  protected readonly documentoOptions: SelectOption[] = [
    { value: 'DNI', label: 'DNI' },
    { value: 'CE', label: 'Carné de Extranjería' },
    { value: 'Pasaporte', label: 'Pasaporte' },
    { value: 'RUC', label: 'RUC' },
  ];

  // --- Listado, búsqueda, filtros y paginación ---
  protected readonly pageSize = PAGE_SIZE;
  protected query = signal('');
  protected tipoFiltro = signal('');
  protected estadoFiltro = signal('');
  protected documentoFiltro = signal('');
  protected page = signal(1);

  protected clientesFiltrados = computed(() => {
    const q = this.query().trim().toLowerCase();
    const tipo = this.tipoFiltro();
    const estado = this.estadoFiltro();
    const documento = this.documentoFiltro();
    return this.clienteService
      .clientes()
      .filter(
        c =>
          (!q ||
            nombreCliente(c).toLowerCase().includes(q) ||
            c.doc.toLowerCase().includes(q) ||
            c.codigo.toLowerCase().includes(q)) &&
          (!tipo || c.tipo === tipo) &&
          (!estado || c.estado === estado) &&
          (!documento || c.tipoDoc === documento),
      );
  });

  protected pageCount = computed(() => Math.max(1, Math.ceil(this.clientesFiltrados().length / PAGE_SIZE)));
  protected paginaActual = computed(() => Math.min(this.page(), this.pageCount()));

  protected clientesPagina = computed(() => {
    const pagina = this.paginaActual();
    return this.clientesFiltrados().slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
  });

  protected columns = signal<DsColumn[]>([
    { key: 'codigo', header: 'Código', width: '120px' },
    { key: 'nombre', header: 'Cliente' },
    { key: 'doc', header: 'Documento', width: '168px' },
    { key: 'tipo', header: 'Tipo', width: '118px' },
    { key: 'telefono', header: 'Teléfono', width: '130px', muted: true },
    { key: 'estado', header: 'Estado', width: '110px' },
    { key: 'acciones', header: 'Acciones', width: '150px', align: 'right' },
  ]);

  ngAfterViewInit(): void {
    this.columns.update(cols =>
      cols.map(col => {
        if (col.key === 'codigo') return { ...col, cellTemplate: this.codigoCellTpl };
        if (col.key === 'nombre') return { ...col, cellTemplate: this.clienteCellTpl };
        if (col.key === 'doc') return { ...col, cellTemplate: this.documentoCellTpl };
        if (col.key === 'tipo') return { ...col, cellTemplate: this.tipoCellTpl };
        if (col.key === 'estado') return { ...col, cellTemplate: this.estadoCellTpl };
        if (col.key === 'acciones') return { ...col, cellTemplate: this.accionesCellTpl };
        return col;
      }),
    );
  }

  protected tipoTone(tipo: Cliente['tipo']): BadgeTone {
    return tipo === 'Mayorista' ? 'brand' : 'neutral';
  }

  protected estadoTone(estado: Cliente['estado']): BadgeTone {
    return estado === 'Activo' ? 'success' : 'neutral';
  }

  // --- Alta / edición de cliente ---
  protected modo = signal<'nuevo' | 'editar' | null>(null);
  protected clienteSeleccionado = signal<string | null>(null);
  protected f = signal<ClienteFormModel>(clienteFormVacio());
  protected errores = signal<string[]>([]);

  protected nuevoCliente() {
    this.modo.set('nuevo');
    this.clienteSeleccionado.set(null);
    this.errores.set([]);
    this.f.set(clienteFormVacio());
  }

  protected editarCliente(c: Cliente) {
    this.modo.set('editar');
    this.clienteSeleccionado.set(c.codigo);
    this.errores.set([]);
    this.f.set({ ...c });
  }

  // TODO: cuando exista el módulo de Pedidos, construir la vista de detalle
  // (RF-A21/22) mostrando también el historial de pedidos finalizados.
  protected verCliente(c: Cliente) {
    console.log('ver detalle (pendiente, depende de Pedidos)', c.codigo);
  }

  protected cerrarForm() {
    this.modo.set(null);
    this.clienteSeleccionado.set(null);
    this.errores.set([]);
  }

  protected actualizarCampo<K extends keyof ClienteFormModel>(campo: K, valor: ClienteFormModel[K]) {
    this.f.update(curr => ({ ...curr, [campo]: valor }));
  }

  protected onTipoDoc(tipoDoc: string) {
    const t = tipoDoc as TipoDocumento;
    this.f.update(curr => limpiarPersona({ ...curr, tipoDoc: t }, personaPorDocumento(t, curr.doc)));
  }

  protected onTipo(valor: string) {
    this.actualizarCampo('tipo', valor as Cliente['tipo']);
  }

  protected onDoc(valor: string) {
    const doc = valor.replace(/\s/g, '');
    this.f.update(curr => limpiarPersona({ ...curr, doc }, personaPorDocumento(curr.tipoDoc, doc)));
  }

  protected guardar() {
    const f = this.f();
    const errores = validarCliente(f);
    if (errores.length) {
      this.errores.set(errores);
      return;
    }
    if (this.modo() === 'editar') {
      this.clienteService.actualizar(this.clienteSeleccionado()!, f);
    } else {
      this.clienteService.registrar(f);
    }
    this.cerrarForm();
  }

  // --- Eliminar (lógico: alterna Activo/Inactivo, no borra el registro) ---
  protected clienteAEliminarCodigo = signal<string | null>(null);

  protected clienteAEliminar = computed(() => {
    const codigo = this.clienteAEliminarCodigo();
    return codigo ? (this.clienteService.clientes().find(c => c.codigo === codigo) ?? null) : null;
  });

  protected pedirEliminar(c: Cliente) {
    this.clienteAEliminarCodigo.set(c.codigo);
  }

  protected cancelarEliminar() {
    this.clienteAEliminarCodigo.set(null);
  }

  protected confirmarEliminar() {
    const codigo = this.clienteAEliminarCodigo();
    if (codigo) this.clienteService.alternarEstado(codigo);
    this.clienteAEliminarCodigo.set(null);
  }
}