import { Iniciativa } from './iniciativa.interface';

export type TableroColorSemaforo = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface TableroControl {
  planId: number;
  planNombre: string;
  anioInicio: number;
  anioFin: number;
  perspectivas: TableroPerspectiva[];
}

export interface TableroPerspectiva {
  id: number;
  nombre: string;
  orden: number;
  kpis: TableroKpiFila[];
}

export interface TableroKpiFila {
  kpiId: number;
  codigo: string;
  nombre: string;
  formula: string;
  unidadSimbolo: string;
  frecuenciaNombre: string;
  objetivoCodigo: string;
  objetivoNombre: string;
  responsable: string;
  iniciativas: Iniciativa[];
  anios: TableroAnio[];
}

export interface TableroAnio {
  anio: number;
  meta: number | null;
  periodo: {
    codigo: string;
    nombre: string;
  } | null;
  valor: number | null;
  color: TableroColorSemaforo | null;
}
