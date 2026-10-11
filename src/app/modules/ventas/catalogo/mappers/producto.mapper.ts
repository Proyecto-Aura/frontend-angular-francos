import {
  ActualizarProductoPresentacionRequestDto,
  ActualizarProductoRequestDto,
  ActualizarPromocionRequestDto,
  CategoriaDto,
  CrearProductoPresentacionInlineRequestDto,
  CrearProductoPresentacionRequestDto,
  CrearProductoRequestDto,
  CrearPromocionRequestDto,
  PresentacionDto,
  ProductoPresentacionFilaDto,
} from '../interfaces/producto-dto.interface';
import {
  OpcionCatalogo,
  PresentacionForm,
  Producto,
  ProductoFormModel,
} from '../interfaces/producto.interface';

/** Etiqueta de una presentación del catálogo: "100 gr", "1 kg". */
export const etiquetaPresentacion = (cantidad: number, unidadMedida: string): string =>
  `${cantidad} ${unidadMedida}`;

export function toOpcionCategoria(dto: CategoriaDto): OpcionCatalogo {
  return { id: dto.id, nombre: dto.nombre, activa: dto.estado };
}

export function toOpcionPresentacion(dto: PresentacionDto): OpcionCatalogo {
  return {
    id: dto.id,
    nombre: etiquetaPresentacion(dto.cantidad, dto.unidad_medida),
    activa: dto.estado,
  };
}

/** Agrupa las filas del listado (una por presentación) en productos con sus presentaciones. */
export function toProductos(filas: ProductoPresentacionFilaDto[]): Producto[] {
  const productos = new Map<number, Producto>();

  for (const fila of filas) {
    let producto = productos.get(fila.producto.id);

    if (!producto) {
      producto = {
        id: fila.producto.id,
        nombre: fila.producto.nombre,
        categoriaId: fila.producto.categoria.id,
        categoria: fila.producto.categoria.nombre,
        descripcion: fila.producto.descripcion ?? '',
        destacado: fila.producto.destacado,
        presentaciones: [],
      };
      productos.set(producto.id, producto);
    }

    const promocion = fila.promocion_vigente;

    producto.presentaciones.push({
      id: fila.presentacion_id,
      productoPresentacionId: fila.id,
      nombre: etiquetaPresentacion(fila.presentacion.cantidad, fila.presentacion.unidad_medida),
      sku: fila.sku,
      slug: fila.slug ?? '',
      precioUnit: fila.precio_unitario,
      precioMayor: fila.precio_mayorista ?? 0,
      umbral: fila.umbral_mayorista ?? 0,
      promo: promocion
        ? {
            id: promocion.id,
            pct: promocion.valor,
            ini: promocion.fecha_inicio,
            fin: promocion.fecha_fin,
          }
        : null,
      imagen: fila.imagen_url ?? '',
      visible: fila.visible_portal_b,
      estado: fila.estado ? 'Activo' : 'Inactivo',
      stock: fila.producto_terminado?.stock_actual ?? 0,
    });
  }

  return [...productos.values()];
}

// ───────────────────────── Formulario -> peticiones ─────────────────────────

function toPresentacionInline(p: PresentacionForm): CrearProductoPresentacionInlineRequestDto {
  return {
    presentacion_id: Number(p.presentacionId),
    precio_unitario: Number(p.precioUnit),
    precio_mayorista: Number(p.precioMayor),
    umbral_mayorista: Number(p.umbral),
  };
}

export function toCrearProductoRequest(pf: ProductoFormModel): CrearProductoRequestDto {
  const descripcion = pf.descripcion.trim();

  return {
    categoria_id: Number(pf.categoriaId),
    nombre: pf.nombre.trim(),
    ...(descripcion ? { descripcion } : {}),
    destacado: pf.destacado,
    producto_presentaciones: pf.presentaciones.map(toPresentacionInline),
  };
}

export function toActualizarProductoRequest(pf: ProductoFormModel): ActualizarProductoRequestDto {
  return {
    categoria_id: Number(pf.categoriaId),
    nombre: pf.nombre.trim(),
    descripcion: pf.descripcion.trim(),
    destacado: pf.destacado,
  };
}

export function toCrearProductoPresentacionRequest(
  productoId: number,
  p: PresentacionForm,
): CrearProductoPresentacionRequestDto {
  return { producto_id: productoId, ...toPresentacionInline(p) };
}

// El SKU, el slug y la presentación de una presentación ya registrada no cambian:
// solo se editan los precios y el umbral (la imagen se sube aparte, como archivo).
export function toActualizarProductoPresentacionRequest(
  p: PresentacionForm,
): ActualizarProductoPresentacionRequestDto {
  return {
    precio_unitario: Number(p.precioUnit),
    precio_mayorista: Number(p.precioMayor),
    umbral_mayorista: Number(p.umbral),
  };
}

export function toCrearPromocionRequest(
  productoPresentacionId: number,
  p: PresentacionForm,
): CrearPromocionRequestDto {
  return {
    producto_presentacion_id: productoPresentacionId,
    valor: Number(p.promoPct),
    fecha_inicio: p.promoIni,
    fecha_fin: p.promoFin,
  };
}

export function toActualizarPromocionRequest(p: PresentacionForm): ActualizarPromocionRequestDto {
  return {
    valor: Number(p.promoPct),
    fecha_inicio: p.promoIni,
    fecha_fin: p.promoFin,
  };
}
