import {
  DetalleSolicitudInsumoDto,
  SolicitudInsumoDto,
} from '../interfaces/solicitud-insumo-dto.interface';
import {
  etiquetaAccionSiguienteEstadoInsumo,
  etiquetaDisponibilidadSolicitudInsumo,
  etiquetaEstadoSolicitudInsumo,
  puedeCancelarSolicitudInsumo,
  siguienteEstadoSolicitudInsumo,
  tonoDisponibilidadSolicitudInsumo,
  tonoEstadoSolicitudInsumo,
  toResumenSolicitudesInsumo,
  toSolicitudInsumo,
  toSolicitudesInsumoPagina,
} from './solicitud-insumo.mapper';

function makeDetalleDto(
  overrides: Partial<DetalleSolicitudInsumoDto> = {},
): DetalleSolicitudInsumoDto {
  return {
    id: 1,
    insumo_id: 50,
    insumo_sku: 'INS-050',
    insumo_nombre: 'Harina de camote',
    insumo_unidad_medida: 'kg',
    cantidad_solicitada: 20,
    created_at: '2026-11-04T00:00:00.000Z',
    ...overrides,
  };
}

function makeSolicitudDto(overrides: Partial<SolicitudInsumoDto> = {}): SolicitudInsumoDto {
  return {
    id: 10,
    codigo_solicitud: 'FR-SIN-001-261104',
    solicitud_produccion_id: null,
    estado: 'pendiente',
    fecha_creacion: '2026-11-04T19:30:00.000Z',
    fecha_limite: '2026-11-05',
    solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-11-04T19:30:00.000Z',
    updated_at: '2026-11-04T19:30:00.000Z',
    detalle: [makeDetalleDto()],
    ...overrides,
  };
}

describe('solicitudInsumoMapper (Inventario)', () => {
  it('maps a solicitud DTO from snake_case to the view model, including su detalle', () => {
    expect(toSolicitudInsumo(makeSolicitudDto())).toEqual({
      id: 10,
      codigo: 'FR-SIN-001-261104',
      solicitudProduccionId: null,
      cantidadInsumos: 1,
      estado: 'pendiente',
      fechaCreacion: '2026-11-04T19:30:00.000Z',
      fechaLimite: '2026-11-05',
      solicitadoPorNombre: 'M. Quispe',
      detalle: [
        {
          id: 1,
          insumoId: 50,
          sku: 'INS-050',
          insumoNombre: 'Harina de camote',
          unidadMedida: 'kg',
          stockDisponible: null,
          cantidadSolicitada: 20,
        },
      ],
    });
  });

  it('maps stock_disponible por linea y disponibilidad a nivel solicitud cuando vienen (GET :id)', () => {
    const solicitud = toSolicitudInsumo(
      makeSolicitudDto({
        detalle: [makeDetalleDto({ stock_disponible: 10 })],
        disponibilidad: 'parcial',
      }),
    );
    expect(solicitud.detalle[0].stockDisponible).toBe(10);
    expect(solicitud.disponibilidad).toBe('parcial');
  });

  it('usa el conteo del listado aunque la respuesta no incluya detalle', () => {
    const solicitud = toSolicitudInsumo(
      makeSolicitudDto({ cantidad_insumos: 3, detalle: undefined }),
    );
    expect(solicitud.cantidadInsumos).toBe(3);
    expect(solicitud.detalle).toEqual([]);
  });

  it('defaults detalle a [] cuando no viene en la respuesta, en vez de tirar', () => {
    const dtoSinDetalle: SolicitudInsumoDto = {
      id: 2,
      codigo_solicitud: 'FR-SIN-002-261104',
      solicitud_produccion_id: 5,
      estado: 'pendiente',
      fecha_creacion: '2026-11-04T19:30:00.000Z',
      fecha_limite: null,
      solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
      solicitado_por_nombre: "Admin Sistema Franco's",
      created_at: '2026-11-04T19:30:00.000Z',
      updated_at: '2026-11-04T19:30:00.000Z',
    };

    expect(() => toSolicitudInsumo(dtoSinDetalle)).not.toThrow();
    expect(toSolicitudInsumo(dtoSinDetalle)).toMatchObject({
      codigo: 'FR-SIN-002-261104',
      solicitudProduccionId: 5,
      detalle: [],
    });
  });

  it('maps every page item and copies pagination metadata', () => {
    const result = toSolicitudesInsumoPagina({
      data: [
        makeSolicitudDto(),
        makeSolicitudDto({ id: 11, codigo_solicitud: 'FR-SIN-002-261104' }),
      ],
      meta: { total: 12, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result.solicitudes).toHaveLength(2);
    expect(result.solicitudes[1]).toMatchObject({ id: 11, codigo: 'FR-SIN-002-261104' });
    expect(result).toMatchObject({ total: 12, pagina: 2, totalPaginas: 2 });
  });

  it('maps los indicadores, renombrando entregado/rechazado a completadas/canceladas', () => {
    expect(
      toResumenSolicitudesInsumo({
        pendiente: 2,
        en_proceso: 1,
        entregado: 3,
        rechazado: 1,
        total: 7,
      }),
    ).toEqual({ pendientes: 2, enProceso: 1, completadas: 3, canceladas: 1 });
  });

  describe('etiquetaEstadoSolicitudInsumo / tonoEstadoSolicitudInsumo', () => {
    it('maps entregado/rechazado a las etiquetas visuales (Entregado/Rechazado)', () => {
      expect(etiquetaEstadoSolicitudInsumo('pendiente')).toBe('Pendiente');
      expect(etiquetaEstadoSolicitudInsumo('en_proceso')).toBe('En proceso');
      expect(etiquetaEstadoSolicitudInsumo('entregado')).toBe('Entregado');
      expect(etiquetaEstadoSolicitudInsumo('rechazado')).toBe('Rechazado');
    });

    it('maps each estado to its badge tone', () => {
      expect(tonoEstadoSolicitudInsumo('pendiente')).toBe('warning');
      expect(tonoEstadoSolicitudInsumo('en_proceso')).toBe('info');
      expect(tonoEstadoSolicitudInsumo('entregado')).toBe('success');
      expect(tonoEstadoSolicitudInsumo('rechazado')).toBe('danger');
    });
  });

  describe('siguienteEstadoSolicitudInsumo / etiquetaAccionSiguienteEstadoInsumo', () => {
    it('avanza pendiente -> en_proceso -> entregado', () => {
      expect(siguienteEstadoSolicitudInsumo('pendiente')).toBe('en_proceso');
      expect(siguienteEstadoSolicitudInsumo('en_proceso')).toBe('entregado');
    });

    it('no tiene siguiente estado desde entregado o rechazado', () => {
      expect(siguienteEstadoSolicitudInsumo('entregado')).toBeNull();
      expect(siguienteEstadoSolicitudInsumo('rechazado')).toBeNull();
    });

    it('etiqueta la accion segun el siguiente estado', () => {
      expect(etiquetaAccionSiguienteEstadoInsumo('pendiente')).toBe('Iniciar entrega');
      expect(etiquetaAccionSiguienteEstadoInsumo('en_proceso')).toBe('Marcar entregado');
      expect(etiquetaAccionSiguienteEstadoInsumo('entregado')).toBeNull();
    });
  });

  describe('puedeCancelarSolicitudInsumo', () => {
    it('solo permite cancelar desde pendiente', () => {
      expect(puedeCancelarSolicitudInsumo('pendiente')).toBe(true);
      expect(puedeCancelarSolicitudInsumo('en_proceso')).toBe(false);
      expect(puedeCancelarSolicitudInsumo('entregado')).toBe(false);
      expect(puedeCancelarSolicitudInsumo('rechazado')).toBe(false);
    });
  });

  describe('etiquetaDisponibilidadSolicitudInsumo / tonoDisponibilidadSolicitudInsumo', () => {
    it('mapea los 3 estados a sus etiquetas y tonos (mismo criterio que Pedidos)', () => {
      expect(etiquetaDisponibilidadSolicitudInsumo('completo')).toBe('Stock completo');
      expect(etiquetaDisponibilidadSolicitudInsumo('parcial')).toBe('Stock parcial');
      expect(etiquetaDisponibilidadSolicitudInsumo('sin_stock')).toBe('Sin stock');

      expect(tonoDisponibilidadSolicitudInsumo('completo')).toBe('success');
      expect(tonoDisponibilidadSolicitudInsumo('parcial')).toBe('warning');
      expect(tonoDisponibilidadSolicitudInsumo('sin_stock')).toBe('danger');
    });
  });
});
