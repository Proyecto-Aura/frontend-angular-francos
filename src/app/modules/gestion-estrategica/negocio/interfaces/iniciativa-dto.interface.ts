import { EstadoIniciativaCodigo } from './iniciativa.interface';

export interface IniciativaDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  responsable: string;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto: number | null;
  motivo_cancelacion: string | null;
  estado: boolean;
  estado_iniciativa: {
    id: number;
    codigo: EstadoIniciativaCodigo;
    nombre: string;
  };
  objetivo: {
    id: number;
    nombre: string;
    perspectiva: {
      id: number;
      nombre: string;
    };
  };
}

export interface CrearIniciativaRequestDto {
  objetivo_estrategico_id: number;
  nombre: string;
  descripcion?: string;
  responsable: string;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto?: number;
}

export interface ActualizarIniciativaRequestDto {
  objetivo_estrategico_id?: number;
  nombre: string;
  descripcion?: string;
  responsable: string;
  fecha_inicio: string;
  fecha_fin: string;
  presupuesto?: number;
}

export interface ActualizarEstadoIniciativaRequestDto {
  estado_codigo: 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';
  motivo_cancelacion?: string;
}

export interface IniciativaApiErrorDto {
  statusCode: number;
  message: string | string[];
}
