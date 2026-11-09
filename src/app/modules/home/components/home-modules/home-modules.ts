import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HomeCards } from '../home-cards/home-cards';
import { MenuService } from '../../../../core/services/menu.service';

interface ModuleCard {
  icon: string;
  title: string;
  description: string;
  routerLink: string;
}

// El backend manda "nombre" + "icono" (texto Lucide) por modulo, pero las
// tarjetas del home usan los SVG propios de marca que ya existian, no
// iconos genericos — este mapeo decide que asset e routerLink usar por
// modulo, y de paso funciona como "whitelist": un modulo que el backend
// devuelva pero que todavia no tenga pagina real en el front simplemente
// no aparece, en vez de ser un link roto.
const MODULE_CARD_INFO: Record<string, { icon: string; routerLink: string }> = {
  ventas: { icon: '/icons/module_ventas.svg', routerLink: '/ventas' },
  inventario: { icon: '/icons/module_inventario.svg', routerLink: '/inventario' },
  estrategico: {
    icon: '/icons/module-gestion-estrategica.png',
    routerLink: '/gestion-estrategica',
  },
  configuracion: { icon: '/icons/module_configuracion.svg', routerLink: '/configuracion' },
  produccion: { icon: '/icons/module_produccion.svg', routerLink: '/produccion' },
  // "despacho-pedidos" es el nombre real (HU-A-023, confirmado por el
  // backend) — el icono es un SVG placeholder propio (no hay arte de marca
  // todavia, pedido explicito del usuario mientras tanto), reemplazar en
  // public/icons/module_despacho.svg cuando llegue el definitivo.
  'despacho-pedidos': { icon: '/icons/module_despacho.svg', routerLink: '/despacho-pedidos' },
};

// Fallback mientras responde /rutas/mi-menu (o si falla) — solo los modulos
// que todo usuario del portal puede ver. Configuracion no va aqui: es solo
// del admin y aparece cuando el backend se lo devuelve.
const FALLBACK_MODULES: ModuleCard[] = [
  {
    icon: MODULE_CARD_INFO['ventas'].icon,
    title: 'Ventas',
    description: 'Gestión de ventas y pedidos',
    routerLink: '/ventas',
  },
  {
    icon: MODULE_CARD_INFO['inventario'].icon,
    title: 'Inventario',
    description: 'Control de stock y productos',
    routerLink: '/inventario',
  },
  {
    icon: MODULE_CARD_INFO['estrategico'].icon,
    title: 'Gestión Estratégica',
    description: 'Planeamiento y seguimiento estratégico',
    routerLink: '/gestion-estrategica',
  },
];

// Orden pedido a mano: Ventas, Inventario, Gestion Estrategica, Produccion,
// Despacho, Configuracion. Todos son nombres reales de la BD (confirmado
// por el backend) — "despacho-pedidos" (HU-A-023) ya es el nombre real
// confirmado, no un supuesto (se verifico contra /rutas/mi-menu en vivo).
const MODULE_ORDER = [
  'ventas',
  'inventario',
  'estrategico',
  'produccion',
  'despacho-pedidos',
  'configuracion',
];

function ordenDe(nombre: string): number {
  const index = MODULE_ORDER.indexOf(nombre);
  return index === -1 ? MODULE_ORDER.length : index;
}

@Component({
  imports: [HomeCards],
  selector: 'app-home-modules',
  templateUrl: './home-modules.html',
})
export class HomeModules {
  private menuService = inject(MenuService);

  // Arranca con el fallback (asi el home no aparece vacio mientras responde
  // la API) y se reemplaza con lo que el usuario realmente puede ver segun
  // /rutas/mi-menu — ya filtrado por rol server-side.
  protected readonly modules = signal<ModuleCard[]>(FALLBACK_MODULES);

  constructor() {
    this.menuService
      .getTree()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (tree) => {
          const cards = tree
            .filter((nodo) => MODULE_CARD_INFO[nodo.nombre])
            .sort((a, b) => ordenDe(a.nombre) - ordenDe(b.nombre))
            .map((nodo) => {
              const info = MODULE_CARD_INFO[nodo.nombre];
              return {
                icon: info.icon,
                title: nodo.etiqueta,
                description: nodo.descripcion ?? '',
                routerLink: info.routerLink,
              };
            });
          if (cards.length > 0) this.modules.set(cards);
        },
        error: () => undefined,
      });
  }
}
