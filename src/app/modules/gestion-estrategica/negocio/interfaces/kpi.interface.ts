import { ColorSemaforoDto, OperadorSemaforoDto } from './kpi-dto.interface';

export type OperadorMeta = '>=' | '<=';
export type ColorSemaforo = ColorSemaforoDto;

export interface MetaAnual {
  anio: number;
  meta: number;
  operador: OperadorMeta;
  valorAmarillo: number;
  operadorAmarillo: OperadorSemaforoDto;
}

export interface Kpi {
  id: number;
  codigo: string;
  nombre: string;
  formula: string;
  objetivoId: number;
  objetivoNombre: string;
  objetivoResponsable: string;
  perspectivaId: number;
  perspectivaNombre: string;
  frecuenciaId: number;
  frecuenciaNombre: string;
  unidadId: number;
  unidadSimbolo: string;
  metaFinal: number | null;
  metas: MetaAnual[];
  ultimoValor: KpiValor | null;
}

export interface KpiValor {
  id: number;
  anio: number;
  periodoId: number;
  periodoNombre: string;
  valor: number;
  color: ColorSemaforo;
}

export interface MetaAnualForm {
  anio: number;
  meta: string;
  operador: OperadorMeta;
  valorAmarillo: string;
}

export interface KpiForm {
  nombre: string;
  formula: string;
  objetivoId: number;
  frecuenciaId: number;
  unidadId: number;
  metas: MetaAnualForm[];
}

export interface Frecuencia {
  id: number;
  nombre: string;
  periodosPorAnio: number;
  orden: number;
}

export interface Periodo {
  id: number;
  codigo: string;
  nombre: string;
  numero: number;
  mesFin: number;
}

export interface UnidadMedida {
  id: number;
  nombre: string;
  simbolo: string;
  decimales: number;
}
