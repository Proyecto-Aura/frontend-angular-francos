import { Routes } from '@angular/router';
import {
  LucideBriefcase,
  LucideChartColumn,
  LucideFlag,
  LucideFolderOpen,
  LucideLayoutDashboard,
  LucideMap,
  LucideMonitor,
  LucideRocket,
  LucideTarget,
} from '@lucide/angular';

// Nota: label/icon/path hoy estan fijos aca a mano. Cuando exista el backend,
// esta estructura (y que opciones ve cada usuario) deberia venir de la BD segun su rol.
export const GESTION_ESTRATEGICA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/module-layout/module-layout').then((c) => c.ModuleLayout),
    data: {
      sidebarTitle: 'Gestión estratégica',
      sidebarLinks: [
        { label: 'Plan estratégico', path: 'plan-estrategico', icon: LucideTarget },
        {
          label: 'Gestión estratégica de negocio',
          icon: LucideBriefcase,
          children: [
            {
              label: 'Gestión de objetivos estratégicos',
              path: 'negocio/objetivos',
              icon: LucideFlag,
            },
            { label: 'Mapa estratégico', path: 'negocio/mapa', icon: LucideMap },
            { label: 'Gestionar KPIs', path: 'negocio/kpis', icon: LucideChartColumn },
            { label: 'Gestionar iniciativas', path: 'negocio/iniciativas', icon: LucideRocket },
            {
              label: 'Tablero de control',
              path: 'negocio/tablero',
              icon: LucideLayoutDashboard,
            },
            {
              label: 'Análisis estratégico',
              path: 'negocio/analisis',
              icon: LucideFolderOpen,
            },
          ],
        },
        { label: 'Gestión estratégica de TI', path: 'ti', icon: LucideMonitor },
      ],
    },
    children: [
      {
        path: 'plan-estrategico',
        loadComponent: () =>
          import('./plan-estrategico/pages/plan-estrategico-home/plan-estrategico-home').then(
            (c) => c.PlanEstrategicoHome,
          ),
      },
      {
        path: 'negocio',
        loadChildren: () => import('./negocio/negocio.route').then((m) => m.NEGOCIO_ROUTES),
      },
      {
        path: 'ti',
        loadChildren: () => import('./ti/ti.route').then((m) => m.TI_ROUTES),
      },
      {
        path: '',
        redirectTo: 'plan-estrategico',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'plan-estrategico',
      },
    ],
  },
];
