import {
  ActualizarInsumoRequestDto,
  CrearInsumoRequestDto,
  IndicadoresInsumosDto,
  InsumoDto,
  InsumosPageDto,
} from '../interfaces/insumo-dto.interface';
import { Insumo, InsumoForm, InsumosPagina, ResumenInsumos } from '../interfaces/insumo.interface';

export function toInsumo(dto: InsumoDto): Insumo {
  return {
    id: dto.id,
    sku: dto.sku,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    unidadMedida: dto.unidad_medida,
    stockActual: dto.stock_actual,
    stockMinimo: dto.stock_minimo,
    stockMaximo: dto.stock_maximo,
    tipo: dto.tipo,
    estado: dto.estado,
  };
}

export function toInsumosPagina(pageDto: InsumosPageDto): InsumosPagina {
  return {
    insumos: pageDto.data.map(toInsumo),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

export function toResumenInsumos(dto: IndicadoresInsumosDto): ResumenInsumos {
  return {
    total: dto.total,
    normal: dto.normal,
    alto: dto.alto,
    bajo: dto.bajo,
    agotados: dto.agotado,
  };
}

// El backend rechaza "descripcion": null por tipo — si esta vacia, se omite
// la key por completo (confirmado con el backend).
//
// stock_actual NO se manda: el backend confirmo que ya no es parte de
// CreateInsumoDto (lo rechaza con 400 "property stock_actual should not
// exist") — nace siempre en 0 y un trigger de Postgres lo recalcula solo a
// partir de los lotes reales (ver lote-insumo.mapper.ts).
export function toCrearInsumoRequest(form: InsumoForm): CrearInsumoRequestDto {
  const descripcion = form.descripcion.trim();

  return {
    nombre: form.nombre.trim(),
    ...(descripcion ? { descripcion } : {}),
    tipo: form.tipo as CrearInsumoRequestDto['tipo'],
    unidad_medida: form.unidadMedida as CrearInsumoRequestDto['unidad_medida'],
    stock_minimo: Number(form.stockMinimo),
    stock_maximo: Number(form.stockMaximo),
  };
}

// Mismas reglas que crear (descripcion se omite si esta vacia), sin
// stock_actual — eso no se toca desde este formulario (ver nota en la
// interfaz de ActualizarInsumoRequestDto).
export function toActualizarInsumoRequest(form: InsumoForm): ActualizarInsumoRequestDto {
  const descripcion = form.descripcion.trim();

  return {
    nombre: form.nombre.trim(),
    ...(descripcion ? { descripcion } : {}),
    tipo: form.tipo as ActualizarInsumoRequestDto['tipo'],
    unidad_medida: form.unidadMedida as ActualizarInsumoRequestDto['unidad_medida'],
    stock_minimo: Number(form.stockMinimo),
    stock_maximo: Number(form.stockMaximo),
  };
}
