export type EstadoObjetivoCodigo = 'PENDIENTE' | 'EN_PROCESO' | 'CUMPLIDO' | 'CANCELADO';

export const TRANSICIONES_OBJETIVO: Record<EstadoObjetivoCodigo, EstadoObjetivoCodigo[]> = {
  PENDIENTE: ['EN_PROCESO', 'CANCELADO'],
  EN_PROCESO: ['CUMPLIDO', 'CANCELADO'],
  CUMPLIDO: [],
  CANCELADO: [],
};

export const ESTADOS_OBJETIVO: { codigo: EstadoObjetivoCodigo; nombre: string }[] = [
  { codigo: 'PENDIENTE', nombre: 'Pendiente' },
  { codigo: 'EN_PROCESO', nombre: 'En proceso' },
  { codigo: 'CUMPLIDO', nombre: 'Cumplido' },
  { codigo: 'CANCELADO', nombre: 'Cancelado' },
];

export interface PerspectivaBsc {
  id: number;
  nombre: string;
  orden: number;
}

export interface ObjetivoEstrategico {
  id: number;
  codigo: string;
  planId: number;
  nombre: string;
  descripcion: string | null;
  responsable: string;
  perspectivaId: number;
  perspectivaNombre: string;
  perspectivaOrden: number;
  estadoCodigo: EstadoObjetivoCodigo;
  estadoNombre: string;
  relacionesDestinoIds: number[];
}

export interface ObjetivoEstrategicoForm {
  nombre: string;
  descripcion: string;
  responsable: string;
  perspectivaId: number | null;
  relacionesDestinoIds: number[];
}
