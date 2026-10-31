// Espejo del contrato real de /api/v1/solicitudes-produccion (OFT0-261,
// confirmado por el backend).
export type EstadoSolicitudProduccionDto = 'pendiente' | 'en_proceso' | 'entregado' | 'rechazado';

// Detalle embebido via JOIN (confirmado por el backend) — no hace falta
// resolver producto/categoria/presentacion aparte contra
// /producto-presentaciones.
export interface DetalleSolicitudProduccionDto {
  id: number;
  solicitud_produccion_id: number;
  producto_terminado_id: number;
  sku: string;
  producto_id: number;
  producto_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  presentacion_id: number;
  presentacion_cantidad: number;
  presentacion_unidad_medida: 'kg' | 'gr';
  cantidad_solicitada: number;
  created_at: string;
}

export interface SolicitudProduccionDto {
  id: number;
  codigo: string;
  cantidad_productos?: number;
  estado: EstadoSolicitudProduccionDto;
  fecha_creacion: string;
  // Opcional en el POST (confirmado por el backend) — puede venir null en
  // una solicitud creada sin fecha limite, aunque esta UI siempre la exige.
  fecha_limite: string | null;
  // UUID (confirmado por el backend al reproducir el bug de abajo), no un
  // id numerico — no se usa en el front, solo solicitado_por_nombre.
  solicitado_por: string;
  // Ya viene resuelto (nombre completo) — no hace falta pedirlo aparte.
  solicitado_por_nombre: string;
  created_at: string;
  updated_at: string;
  // Opcional a proposito: bug real confirmado por el backend — el
  // presenter de POST /solicitudes-produccion (alta) devuelve solo la
  // cabecera (SolicitudProduccionPresenter.toHttp), sin el array detalle,
  // mientras que GET /solicitudes-produccion/:id SI lo embebe
  // (conDetalleToHttp). Antes esto hacia que dto.detalle.map(...) tirara un
  // TypeError silencioso en la respuesta del POST, que caia al catch
  // generico y mostraba "No se pudo crear la solicitud" aunque el alta
  // hubiera sido exitosa (solicitudes "fantasma": se creaban bien pero la
  // persona creia que habia fallado y podia reintentar, chocando con un
  // 409 de codigo duplicado). El mapper ya lo maneja (detalle ?? []); no
  // hace falta tocar el backend porque el front nunca usa el detalle de la
  // respuesta del POST (recarga la lista completa via GET al guardar).
  detalle?: DetalleSolicitudProduccionDto[];
}

export interface SolicitudesProduccionPageDto {
  data: SolicitudProduccionDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// GET /solicitudes-produccion/indicadores (confirmado por el backend,
// pedido explicito del usuario en vez del workaround de 4 pedidos en
// paralelo por estado).
export interface IndicadoresSolicitudesProduccionDto {
  pendiente: number;
  en_proceso: number;
  entregado: number;
  rechazado: number;
  total: number;
}

// --- Alta (POST /solicitudes-produccion) ---
export interface CrearDetalleSolicitudProduccionItemDto {
  producto_terminado_id: number;
  cantidad_solicitada: number;
}

export interface CrearSolicitudProduccionRequestDto {
  codigo: string;
  fecha_limite?: string;
  // Minimo 1 linea (confirmado por el backend).
  detalle: CrearDetalleSolicitudProduccionItemDto[];
}

// --- Cambio de estado (PATCH /solicitudes-produccion/:id/estado) ---
// La transicion valida depende del rol de quien llama (confirmado por el
// backend) — admin/inventario solo pueden "cancelar" (-> rechazado) con la
// solicitud todavia pendiente; produccion mueve pendiente -> en_proceso ->
// entregado, o pendiente -> rechazado. Fuera de esas transiciones da 409.
export interface CambiarEstadoSolicitudProduccionRequestDto {
  estado: EstadoSolicitudProduccionDto;
}

// --- Edicion (OFT0-261, confirmado por el backend) — "Guardar cambios" en
// el modal de edicion no es un solo endpoint: son llamadas separadas segun
// que cambio (fecha limite / cantidad de una linea existente / alta de
// producto / baja de producto), todas 409 si la solicitud ya no esta
// pendiente. Ver calcularCambiosSolicitudProduccion en el mapper, que arma
// el plan de llamadas a partir del snapshot original vs. el form actual.
export interface ActualizarFechaLimiteSolicitudProduccionRequestDto {
  fecha_limite: string;
}

export interface ActualizarCantidadDetalleSolicitudProduccionRequestDto {
  cantidad_solicitada: number;
}
