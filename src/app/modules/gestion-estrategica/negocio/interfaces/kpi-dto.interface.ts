export type OperadorVerdeDto = '>=' | '<=';
export type OperadorSemaforoDto = '>=' | '>' | '<=' | '<' | '=';
export type ColorSemaforoDto = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface RangoSemaforoDto {
  operador: OperadorSemaforoDto;
  valor_referencia: number;
  color_hex: string;
}

export interface MetaAnualKpiDto {
  anio: number;
  meta: number;
  semaforo: {
    verde: RangoSemaforoDto | null;
    amarillo: RangoSemaforoDto | null;
    rojo: RangoSemaforoDto | null;
  };
}

export interface KpiDto {
  id: number;
  codigo: string;
  nombre: string;
  formula: string;
  estado: boolean;
  objetivo: {
    id: number;
    nombre: string;
    perspectiva: {
      id: number;
      nombre: string;
    };
  };
  frecuencia: {
    id: number;
    nombre: string;
  };
  unidad_medida: {
    id: number;
    nombre: string;
    simbolo: string;
  };
  meta_final: number | null;
  metas_por_anio: MetaAnualKpiDto[];
}

export interface KpiResumenDto extends Omit<KpiDto, 'objetivo'> {
  objetivo: KpiDto['objetivo'] & {
    responsable: string;
  };
  ultimo_valor: KpiValorDto | null;
}

export interface KpisPageDto {
  data: KpiDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface KpiValorDto {
  id: number;
  anio: number;
  periodo: {
    id: number;
    codigo: string;
    nombre: string;
  };
  valor: number;
  semaforo: {
    color: ColorSemaforoDto;
    color_hex: string;
  };
}

export interface MetaAnualRequestDto {
  anio: number;
  meta: number;
  operador_verde: OperadorVerdeDto;
  operador_amarillo: OperadorSemaforoDto;
  valor_amarillo: number;
}

export interface CrearKpiRequestDto {
  objetivo_estrategico_id: number;
  nombre: string;
  formula: string;
  frecuencia_id: number;
  unidad_medida_id: number;
  metas_por_anio: MetaAnualRequestDto[];
}

export interface ActualizarKpiRequestDto {
  objetivo_estrategico_id: number;
  nombre: string;
  formula: string;
  frecuencia_id: number;
  unidad_medida_id: number;
  metas_por_anio: MetaAnualRequestDto[];
}

export interface RegistrarKpiValorRequestDto {
  anio: number;
  periodo_id: number;
  valor: number;
}

export interface FrecuenciaMedicionDto {
  id: number;
  nombre: string;
  periodos_por_anio: number;
  orden: number;
}

export interface PeriodoDto {
  id: number;
  codigo: string;
  nombre: string;
  numero: number;
  mes_fin: number;
}

export interface UnidadMedidaKpiDto {
  id: number;
  nombre: string;
  simbolo: string;
  decimales: number;
}

export interface KpiApiErrorDto {
  statusCode: number;
  message: string | string[];
}
