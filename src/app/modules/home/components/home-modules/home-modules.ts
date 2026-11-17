import { Component, DestroyRef, inject, signal } from '@angular/core';
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
  // Separado de Inventario en su propio rol — mismo caso que Despacho:
  // public/icons/module_insumos.svg es un placeholder propio, reemplazar
  // cuando llegue el arte de marca.
  insumos: { icon: '/icons/module_insumos.svg', routerLink: '/insumos' },
};

// Orden pedido a mano: Ventas, Inventario, Insumos, Gestion Estrategica,
// Produccion, Despacho, Configuracion. Todos son nombres reales de la BD
// (confirmado por el backend) — "despacho-pedidos" (HU-A-023) ya es el
// nombre real confirmado, no un supuesto (se verifico contra /rutas/mi-menu
// en vivo).
const MODULE_ORDER = [
  'ventas',
  'inventario',
  'insumos',
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
  private destroyRef = inject(DestroyRef);

  // Siempre el estado real de /rutas/mi-menu (ya filtrado por rol
  // server-side), sin tarjetas de respaldo: mostrar accesos que despues
  // rebotan a /home confundia a usuarios sin esos permisos (o sin ninguno).
  protected readonly modules = signal<ModuleCard[]>([]);
  protected readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');

  constructor() {
    this.cargar();
  }

  // Tambien lo usa el boton "Reintentar": MenuService vuelve a pedir el
  // arbol tras un error (shareReplay se reinicia al fallar).
  protected cargar(): void {
    this.estado.set('cargando');
    this.menuService
      .getTree()
      .pipe(takeUntilDestroyed(this.destroyRef))
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
          this.modules.set(cards);
          this.estado.set('listo');
        },
        error: () => {
          this.modules.set([]);
          this.estado.set('error');
        },
      });
  }
}
