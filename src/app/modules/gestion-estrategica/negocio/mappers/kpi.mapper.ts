import {
  ActualizarKpiRequestDto,
  CrearKpiRequestDto,
  FrecuenciaMedicionDto,
  KpiDto,
  KpiResumenDto,
  KpiValorDto,
  PeriodoDto,
  UnidadMedidaKpiDto,
} from '../interfaces/kpi-dto.interface';
import {
  Frecuencia,
  Kpi,
  KpiForm,
  KpiValor,
  Periodo,
  UnidadMedida,
} from '../interfaces/kpi.interface';

export function toKpi(dto: KpiDto): Kpi {
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    formula: dto.formula,
    objetivoId: dto.objetivo.id,
    objetivoNombre: dto.objetivo.nombre,
    objetivoResponsable: '',
    perspectivaId: dto.objetivo.perspectiva.id,
    perspectivaNombre: dto.objetivo.perspectiva.nombre,
    frecuenciaId: dto.frecuencia.id,
    frecuenciaNombre: dto.frecuencia.nombre,
    unidadId: dto.unidad_medida.id,
    unidadSimbolo: dto.unidad_medida.simbolo,
    metaFinal: dto.meta_final,
    metas: dto.metas_por_anio.map(({ anio, meta, semaforo }) => ({
      anio,
      meta,
      operador: semaforo.verde?.operador === '<=' ? '<=' : '>=',
      valorAmarillo: semaforo.amarillo?.valor_referencia ?? meta,
      operadorAmarillo:
        semaforo.amarillo?.operador ?? (semaforo.verde?.operador === '<=' ? '<=' : '>='),
    })),
    ultimoValor: null,
  };
}

export function toKpisDePagina(dto: { data: KpiDto[] }): Kpi[] {
  return dto.data.map(toKpi);
}

export function toKpiValor(dto: KpiValorDto): KpiValor {
  return {
    id: dto.id,
    anio: dto.anio,
    periodoId: dto.periodo.id,
    periodoNombre: dto.periodo.nombre,
    valor: dto.valor,
    color: dto.semaforo.color,
  };
}

export function toKpiResumen(dto: KpiResumenDto): Kpi {
  return {
    ...toKpi(dto),
    objetivoResponsable: dto.objetivo.responsable,
    ultimoValor: dto.ultimo_valor ? toKpiValor(dto.ultimo_valor) : null,
  };
}

export function toKpisDeResumen(dtos: KpiResumenDto[]): Kpi[] {
  return dtos.map(toKpiResumen);
}

export function toFrecuencia(dto: FrecuenciaMedicionDto): Frecuencia {
  return {
    id: dto.id,
    nombre: dto.nombre,
    periodosPorAnio: dto.periodos_por_anio,
    orden: dto.orden,
  };
}

export function toPeriodo(dto: PeriodoDto): Periodo {
  return {
    id: dto.id,
    codigo: dto.codigo,
    nombre: dto.nombre,
    numero: dto.numero,
    mesFin: dto.mes_fin,
  };
}

export function toUnidadMedida(dto: UnidadMedidaKpiDto): UnidadMedida {
  return {
    id: dto.id,
    nombre: dto.nombre,
    simbolo: dto.simbolo,
    decimales: dto.decimales,
  };
}

export function toCrearKpiRequest(form: KpiForm): CrearKpiRequestDto {
  return {
    objetivo_estrategico_id: form.objetivoId,
    nombre: form.nombre.trim(),
    formula: form.formula.trim(),
    frecuencia_id: form.frecuenciaId,
    unidad_medida_id: form.unidadId,
    metas_por_anio: toMetasRequest(form),
  };
}

export function toActualizarKpiRequest(form: KpiForm): ActualizarKpiRequestDto {
  return {
    objetivo_estrategico_id: form.objetivoId,
    nombre: form.nombre.trim(),
    formula: form.formula.trim(),
    frecuencia_id: form.frecuenciaId,
    unidad_medida_id: form.unidadId,
    metas_por_anio: toMetasRequest(form),
  };
}

function toMetasRequest(form: KpiForm): ActualizarKpiRequestDto['metas_por_anio'] {
  return form.metas.map((fila) => ({
    anio: fila.anio,
    meta: Number(fila.meta),
    operador_verde: fila.operador,
    operador_amarillo: fila.operador,
    valor_amarillo: Number(fila.valorAmarillo),
  }));
}
