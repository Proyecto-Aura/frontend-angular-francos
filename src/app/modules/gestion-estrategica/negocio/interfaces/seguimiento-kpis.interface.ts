import { TableroColorSemaforo } from './tablero-control.interface';

export interface Cumplimiento {
  porcentaje: number | null;
  evaluados: number;
  total: number;
  verde: number;
  amarillo: number;
  rojo: number;
  sinDato: number;
}

export interface SeguimientoKpis {
  planId: number;
  planNombre: string;
  cumplimientoGeneral: Cumplimiento;
  perspectivas: SeguimientoPerspectiva[];
}

export interface SeguimientoPerspectiva {
  id: number;
  nombre: string;
  orden: number;
  cumplimiento: Cumplimiento;
  kpis: SeguimientoKpi[];
}

export interface SeguimientoKpi {
  kpiId: number;
  codigo: string;
  nombre: string;
  frecuenciaNombre: string;
  unidadSimbolo: string;
  operador: '>=' | '<=';
  avancePct: number | null;
  ultimoValor: {
    anio: number;
    periodoCodigo: string;
    periodoNombre: string;
    valor: number;
    color: TableroColorSemaforo | null;
  } | null;
  metaUltimoAnio: number | null;
  serie: SeguimientoPunto[];
}

export interface SeguimientoPunto {
  anio: number;
  periodoCodigo: string;
  periodoNombre: string;
  valor: number | null;
  meta: number | null;
  color: TableroColorSemaforo | null;
}
