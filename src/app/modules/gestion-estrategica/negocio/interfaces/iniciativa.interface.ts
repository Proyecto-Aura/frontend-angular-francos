export type EstadoIniciativaCodigo = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';

export const TRANSICIONES_INICIATIVA: Record<EstadoIniciativaCodigo, EstadoIniciativaCodigo[]> = {
  PENDIENTE: ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO: ['COMPLETADA', 'CANCELADA'],
  COMPLETADA: [],
  CANCELADA: [],
};

export const ESTADOS_INICIATIVA: { codigo: EstadoIniciativaCodigo; nombre: string }[] = [
  { codigo: 'PENDIENTE', nombre: 'Pendiente' },
  { codigo: 'EN_PROCESO', nombre: 'En proceso' },
  { codigo: 'COMPLETADA', nombre: 'Completada' },
  { codigo: 'CANCELADA', nombre: 'Cancelada' },
];

export interface Iniciativa {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estadoCodigo: EstadoIniciativaCodigo;
  estadoNombre: string;
  objetivoId: number;
  objetivoNombre: string;
  perspectivaId: number;
  perspectivaNombre: string;
}

export interface IniciativaForm {
  nombre: string;
  descripcion: string;
  objetivoId: number | null;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
}
