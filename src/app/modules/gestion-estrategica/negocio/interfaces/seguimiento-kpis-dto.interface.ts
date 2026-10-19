export interface CumplimientoDto {
  porcentaje_promedio: number | null;
  kpis_evaluados: number;
  total_kpis: number;
  kpis_verde: number;
  kpis_amarillo: number;
  kpis_rojo: number;
  kpis_sin_dato: number;
}

export interface SeguimientoKpisDto {
  plan: {
    id: number;
    codigo: string;
    nombre: string;
  };
  cumplimiento_general: CumplimientoDto;
  perspectivas: SeguimientoPerspectivaDto[];
}

export interface SeguimientoPerspectivaDto {
  id: number;
  nombre: string;
  cumplimiento: CumplimientoDto;
  objetivos: SeguimientoObjetivoDto[];
}

export interface SeguimientoObjetivoDto {
  id: number;
  codigo: string;
  nombre: string;
  responsable: string;
  kpis: SeguimientoKpiDto[];
}

export interface SeguimientoKpiDto {
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
  operador: '>=' | '<=';
  ultimo_valor: {
    anio: number;
    periodo: {
      id: number;
      codigo: string;
      nombre: string;
    };
    valor: number;
    semaforo_color: string | null;
  } | null;
  avance_pct: number | null;
  metas_anuales: {
    anio: number;
    meta: number;
  }[];
  serie: SeguimientoPuntoDto[];
}

export interface SeguimientoPuntoDto {
  anio: number;
  periodo: {
    id: number;
    codigo: string;
    nombre: string;
    numero: number;
  };
  valor: number | null;
  meta: number | null;
  semaforo_color: string | null;
}
