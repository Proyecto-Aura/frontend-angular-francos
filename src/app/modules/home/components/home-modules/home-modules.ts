import { Component } from '@angular/core';
import { HomeCards } from '../home-cards/home-cards';

interface ModuleCard {
  icon: string;
  title: string;
  description: string;
  routerLink: string;
}

@Component({
  imports: [HomeCards],
  selector: 'home-modules',
  templateUrl: './home-modules.html',
})
export class HomeModules {
  // TODO: esto es temporal — cuando exista el backend, estos módulos
  // (y a qué ruta lleva cada uno) deberían venir filtrados según el rol del usuario.
  protected readonly modules: ModuleCard[] = [
    {
      icon: '/icons/module_ventas.svg',
      title: 'Ventas',
      description: 'Gestión de ventas y pedidos',
      routerLink: '/ventas',
    },
    {
      icon: '/icons/module_inventario.svg',
      title: 'Inventario',
      description: 'Control de stock y productos',
      routerLink: '/inventario',
    },
    {
      icon: '/icons/module-gestion-estrategica.png',
      title: 'Gestión Estratégica',
      description: 'Análisis y reportes',
      routerLink: '/gestion-estrategica',
    },
    {
      icon: '/icons/module_produccion.svg',
      title: 'Producción',
      description: 'Control de producción',
      routerLink: '/produccion',
    },
    {
      icon: '/icons/module_configuracion.svg',
      title: 'Configuración',
      description: 'Ajustes del sistema',
      routerLink: '/configuracion',
    },
  ];
}
