import { AfterViewInit, Component, TemplateRef, ViewChild, signal } from '@angular/core';
import {
  LucideBarChart3,
  LucideBell,
  LucideDownload,
  LucideLayoutDashboard,
  LucideList,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideSettings,
  LucideShoppingCart,
  LucideTrash2,
  LucideUsers,
} from '@lucide/angular';

import { Avatar } from '../shared/ds/avatar/avatar';
import { Badge, BadgeTone } from '../shared/ds/badge/badge';
import { BarChart, BarChartDatum } from '../shared/ds/bar-chart/bar-chart';
import { Breadcrumb, BreadcrumbItem } from '../shared/ds/breadcrumb/breadcrumb';
import { Button } from '../shared/ds/button/button';
import { Card } from '../shared/ds/card/card';
import { CellStack } from '../shared/ds/cell-stack/cell-stack';
import { Checkbox } from '../shared/ds/checkbox/checkbox';
import { DataTable, DsColumn } from '../shared/ds/data-table/data-table';
import { DropdownMenu, DropdownMenuItem } from '../shared/ds/dropdown-menu/dropdown-menu';
import { Field } from '../shared/ds/field/field';
import { FilterBar } from '../shared/ds/filter-bar/filter-bar';
import { Icon } from '../shared/ds/icon/icon';
import { IconButton } from '../shared/ds/icon-button/icon-button';
import { Input } from '../shared/ds/input/input';
import { KpiCard } from '../shared/ds/kpi-card/kpi-card';
import { Modal } from '../shared/ds/modal/modal';
import { Pagination } from '../shared/ds/pagination/pagination';
import { Radio } from '../shared/ds/radio/radio';
import { Select, SelectOption } from '../shared/ds/select/select';
import { DsSidebar, DsSidebarSection } from '../shared/ds/sidebar/sidebar';
import { Switch } from '../shared/ds/switch/switch';
import { DsTab, Tabs } from '../shared/ds/tabs/tabs';
import { Textarea } from '../shared/ds/textarea/textarea';
import { Tooltip } from '../shared/ds/tooltip/tooltip';
import { Topbar } from '../shared/ds/topbar/topbar';

interface PedidoRow {
  id: string;
  cliente: string;
  ruc: string;
  fecha: string;
  total: string;
  estado: string;
}

@Component({
  imports: [
    Avatar,
    Badge,
    BarChart,
    Breadcrumb,
    Button,
    Card,
    CellStack,
    Checkbox,
    DataTable,
    DropdownMenu,
    Field,
    FilterBar,
    Icon,
    IconButton,
    Input,
    KpiCard,
    Modal,
    Pagination,
    Radio,
    Select,
    DsSidebar,
    Switch,
    Tabs,
    Textarea,
    Tooltip,
    Topbar,
  ],
  selector: 'app-ds-showcase',
  templateUrl: './ds-showcase.html',
})
export class DsShowcase implements AfterViewInit {
  @ViewChild('clienteCell', { static: true }) clienteCellTpl!: TemplateRef<{
    $implicit: PedidoRow;
    index: number;
  }>;
  @ViewChild('estadoCell', { static: true }) estadoCellTpl!: TemplateRef<{
    $implicit: PedidoRow;
    index: number;
  }>;

  readonly LucideUsers = LucideUsers;
  readonly LucidePlus = LucidePlus;
  readonly LucideDownload = LucideDownload;
  readonly LucidePencil = LucidePencil;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideSearch = LucideSearch;
  readonly LucideBell = LucideBell;
  readonly LucideLayoutDashboard = LucideLayoutDashboard;
  readonly LucideShoppingCart = LucideShoppingCart;
  readonly LucidePackage = LucidePackage;
  readonly LucideList = LucideList;
  readonly LucideSettings = LucideSettings;
  readonly LucideBarChart3 = LucideBarChart3;

  badgeTones: { tone: BadgeTone; label: string }[] = [
    { tone: 'neutral', label: 'Neutral' },
    { tone: 'brand', label: 'Marca' },
    { tone: 'success', label: 'Activo' },
    { tone: 'warning', label: 'Pendiente' },
    { tone: 'danger', label: 'Vencido' },
    { tone: 'info', label: 'Informativo' },
  ];

  breadcrumb: BreadcrumbItem[] = [
    { label: 'Inicio', href: '#' },
    { label: 'Ventas', href: '#' },
    { label: 'Pedidos' },
  ];

  kpis = [
    {
      label: 'Ventas del mes',
      value: 'S/ 148,320',
      delta: '+12.4%',
      tone: 'up' as const,
      caption: 'En miles de soles',
    },
    {
      label: 'Pedidos abiertos',
      value: 32,
      delta: '-3',
      tone: 'down' as const,
      caption: '240 registros · actualizado hace 2 h',
    },
    {
      label: 'Clientes activos',
      value: 486,
      delta: '+8',
      tone: 'up' as const,
      caption: 'Últimos 30 días',
    },
  ];

  chartData: BarChartDatum[] = [
    { label: 'Ene', value: 82 },
    { label: 'Feb', value: 95 },
    { label: 'Mar', value: 61 },
    { label: 'Abr', value: 120 },
    { label: 'May', value: 104 },
    { label: 'Jun', value: 140, faded: true },
  ];

  columns = signal<DsColumn[]>([
    { key: 'id', header: 'Pedido' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'fecha', header: 'Fecha' },
    { key: 'total', header: 'Total', align: 'right', numeric: true },
    { key: 'estado', header: 'Estado' },
  ]);

  ngAfterViewInit(): void {
    this.columns.update((cols) =>
      cols.map((col) => {
        if (col.key === 'cliente') return { ...col, cellTemplate: this.clienteCellTpl };
        if (col.key === 'estado') return { ...col, cellTemplate: this.estadoCellTpl };
        return col;
      }),
    );
  }

  rows: PedidoRow[] = [
    {
      id: 'PED-1042',
      cliente: 'Comercial Andina S.A.C.',
      ruc: 'RUC 20548712345',
      fecha: '05 Sep 2026',
      total: 'S/ 4,280.00',
      estado: 'Pagado',
    },
    {
      id: 'PED-1041',
      cliente: 'Distribuidora Rimac E.I.R.L.',
      ruc: 'RUC 20487213456',
      fecha: '04 Sep 2026',
      total: 'S/ 1,150.50',
      estado: 'Pendiente',
    },
    {
      id: 'PED-1040',
      cliente: 'Inversiones del Sur S.A.',
      ruc: 'RUC 20512345678',
      fecha: '03 Sep 2026',
      total: 'S/ 8,940.00',
      estado: 'Pagado',
    },
    {
      id: 'PED-1039',
      cliente: 'Grupo Naviero Callao',
      ruc: 'RUC 20398765432',
      fecha: '02 Sep 2026',
      total: 'S/ 620.00',
      estado: 'Vencido',
    },
    {
      id: 'PED-1038',
      cliente: 'Textiles Miraflores S.A.C.',
      ruc: 'RUC 20476543210',
      fecha: '01 Sep 2026',
      total: 'S/ 3,075.00',
      estado: 'Pagado',
    },
  ];

  estadoTone(estado: string): BadgeTone {
    if (estado === 'Pagado') return 'success';
    if (estado === 'Pendiente') return 'warning';
    return 'danger';
  }

  selectOptions: SelectOption[] = [
    { value: 'lima', label: 'Lima' },
    { value: 'arequipa', label: 'Arequipa' },
    { value: 'trujillo', label: 'Trujillo' },
  ];

  tabs: DsTab[] = [
    { id: 'resumen', label: 'Resumen', count: 12 },
    { id: 'pedidos', label: 'Pedidos', count: 5 },
    { id: 'clientes', label: 'Clientes' },
  ];
  activeTab = signal('resumen');

  sidebarSections: DsSidebarSection[] = [
    {
      label: 'Principal',
      items: [{ id: 'dashboard', label: 'Panel', icon: LucideLayoutDashboard }],
    },
    {
      label: 'Ventas',
      items: [
        { id: 'ventas-clientes', label: 'Clientes', icon: LucideUsers },
        {
          id: 'ventas-catalogo',
          label: 'Catálogo',
          icon: LucidePackage,
          children: [
            { id: 'catalogo-productos', label: 'Gestión de productos', icon: LucideList },
            { id: 'catalogo-config', label: 'Configuración del catálogo', icon: LucideSettings },
          ],
        },
      ],
    },
    {
      label: 'Operación',
      items: [
        { id: 'inventario', label: 'Inventario', icon: LucidePackage, badge: '5' },
        { id: 'configuracion', label: 'Configuración', icon: LucideSettings },
      ],
    },
  ];
  activeSidebarId = signal('ventas');

  dropdownItems: DropdownMenuItem[] = [
    { label: 'Editar', icon: LucidePencil, onSelect: () => undefined },
    { label: 'Exportar', icon: LucideDownload, onSelect: () => undefined },
    { separator: true },
    { label: 'Eliminar', icon: LucideTrash2, destructive: true, onSelect: () => undefined },
  ];

  page = signal(1);
  modalOpen = signal(false);

  inputValue = signal('');
  textareaValue = signal('');
  selectValue = signal('lima');
  checkboxChecked = signal(true);
  switchChecked = signal(true);
  radioValue = signal('mensual');
}
