import {
  ActualizarParametrosVentasRequestDto,
  ParametrosVentasDto,
  PresentacionMayoristaDto,
  PromocionDto,
} from '../interfaces/parametros-ventas-dto.interface';
import {
  ETIQUETA_TIPO_PROMOCION,
  ParametrosVentas,
  PresentacionMayorista,
  Promocion,
} from '../interfaces/parametros-ventas.interface';

export function toParametrosVentas(dto: ParametrosVentasDto): ParametrosVentas {
  return {
    umbralGlobal: dto.umbral_mayorista_global,
    umbralPorProducto: dto.umbral_por_producto,
    promocionesActivas: dto.promociones_activas,
    culqiActivo: dto.culqi_activo,
    efectivoActivo: dto.efectivo_activo,
  };
}

/** Solo viajan los campos presentes: el backend cambia únicamente los que llegan. */
export function toActualizarParametrosRequest(
  cambios: Partial<ParametrosVentas>,
): ActualizarParametrosVentasRequestDto {
  const body: ActualizarParametrosVentasRequestDto = {};
  if (cambios.umbralGlobal !== undefined) body.umbral_mayorista_global = cambios.umbralGlobal;
  if (cambios.umbralPorProducto !== undefined) body.umbral_por_producto = cambios.umbralPorProducto;
  if (cambios.promocionesActivas !== undefined)
    body.promociones_activas = cambios.promocionesActivas;
  if (cambios.culqiActivo !== undefined) body.culqi_activo = cambios.culqiActivo;
  if (cambios.efectivoActivo !== undefined) body.efectivo_activo = cambios.efectivoActivo;
  return body;
}

export function toPresentacionMayorista(dto: PresentacionMayoristaDto): PresentacionMayorista {
  return {
    id: dto.id,
    sku: dto.sku,
    producto: dto.producto.nombre,
    presentacion: `${dto.presentacion.cantidad} ${dto.presentacion.unidad_medida}`,
    umbralPropio: dto.umbral_mayorista,
  };
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** `2026-11-01` -> `01 Nov 2026` (la fecha es de calendario: no pasa por zonas horarias). */
function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia} ${MESES[Number(mes) - 1]} ${anio}`;
}

export function toPromocion(dto: PromocionDto): Promocion {
  return {
    id: dto.id,
    nombre: dto.nombre,
    tipo: ETIQUETA_TIPO_PROMOCION[dto.tipo] ?? dto.tipo,
    vigencia: `${fechaCorta(dto.fecha_inicio)} – ${fechaCorta(dto.fecha_fin)}`,
    activa: dto.estado,
    vigente: dto.vigente,
  };
}
