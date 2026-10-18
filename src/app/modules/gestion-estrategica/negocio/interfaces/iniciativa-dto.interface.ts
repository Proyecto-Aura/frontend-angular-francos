import { EstadoIniciativaCodigo } from './iniciativa.interface';

export interface IniciativaDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  responsable: string;
  fecha_inicio: string;
  fecha_fin: string;
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
}

export interface ActualizarIniciativaRequestDto {
  nombre: string;
  descripcion?: string;
  responsable: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface ActualizarEstadoIniciativaRequestDto {
  estado_codigo: 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA';
}

export interface IniciativaApiErrorDto {
  statusCode: number;
  message: string | string[];
}
