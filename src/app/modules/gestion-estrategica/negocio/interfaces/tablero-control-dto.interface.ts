import { IniciativaDto } from './iniciativa-dto.interface';

export interface TableroControlDto {
  plan: {
    id: number;
    codigo: string;
    nombre: string;
    anio_inicio: number;
    anio_fin: number;
    estado_plan: {
      codigo: string;
      nombre: string;
    };
  };
  perspectivas: TableroPerspectivaDto[];
}

export interface TableroPerspectivaDto {
  id: number;
  nombre: string;
  objetivos: TableroObjetivoDto[];
}

export interface TableroObjetivoDto {
  id: number;
  codigo: string;
  nombre: string;
  responsable: string;
  iniciativas: IniciativaDto[];
  kpis: TableroKpiDto[];
}

export interface TableroKpiDto {
  id: number;
  codigo: string;
  nombre: string;
  formula: string;
  unidad_medida: {
    nombre: string;
    simbolo: string;
  };
  frecuencia: {
    nombre: string;
  };
  valores_por_anio: TableroValorAnualDto[];
}

export interface TableroValorAnualDto {
  anio: number;
  meta: number | null;
  periodo: {
    id: number;
    codigo: string;
    nombre: string;
  } | null;
  valor: number | null;
  semaforo_color: string | null;
}
