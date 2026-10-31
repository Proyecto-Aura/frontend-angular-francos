import {
  DetalleSolicitudProduccionDto,
  SolicitudProduccionDto,
} from '../interfaces/solicitud-produccion-dto.interface';
import { SolicitudProduccionForm } from '../interfaces/solicitud-produccion.interface';
import { FilaEditarSolicitudProduccion } from '../interfaces/solicitud-produccion.interface';
import {
  calcularCambiosSolicitudProduccion,
  construirCodigoSolicitud,
  etiquetaEstadoSolicitud,
  siguienteSecuencialSolicitud,
  toCrearSolicitudProduccionRequest,
  tonoEstadoSolicitud,
  toResumenSolicitudesProduccion,
  toSolicitudProduccion,
  toSolicitudesProduccionPagina,
} from './solicitud-produccion.mapper';

function makeDetalleDto(
  overrides: Partial<DetalleSolicitudProduccionDto> = {},
): DetalleSolicitudProduccionDto {
  return {
    id: 1,
    solicitud_produccion_id: 10,
    producto_terminado_id: 256,
    sku: 'FR-P3-PR2',
    producto_id: 3,
    producto_nombre: 'Camote frito',
    categoria_id: 2,
    categoria_nombre: 'Snacks',
    presentacion_id: 2,
    presentacion_cantidad: 500,
    presentacion_unidad_medida: 'gr',
    cantidad_solicitada: 20,
    created_at: '2026-09-12T00:00:00.000Z',
    ...overrides,
  };
}

function makeSolicitudDto(overrides: Partial<SolicitudProduccionDto> = {}): SolicitudProduccionDto {
  return {
    id: 10,
    codigo: 'SPR-0090',
    estado: 'pendiente',
    fecha_creacion: '2026-09-12',
    fecha_limite: '2026-09-13',
    solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
    solicitado_por_nombre: 'M. Quispe',
    created_at: '2026-09-12T00:00:00.000Z',
    updated_at: '2026-09-12T00:00:00.000Z',
    detalle: [makeDetalleDto()],
    ...overrides,
  };
}

describe('solicitudProduccionMapper', () => {
  it('maps a solicitud DTO from snake_case to the view model, including su detalle', () => {
    expect(toSolicitudProduccion(makeSolicitudDto())).toEqual({
      id: 10,
      codigo: 'SPR-0090',
      cantidadProductos: 1,
      estado: 'pendiente',
      fechaCreacion: '2026-09-12',
      fechaLimite: '2026-09-13',
      solicitadoPorNombre: 'M. Quispe',
      detalle: [
        {
          id: 1,
          productoTerminadoId: 256,
          sku: 'FR-P3-PR2',
          productoNombre: 'Camote frito',
          categoriaNombre: 'Snacks',
          presentacionCantidad: 500,
          presentacionUnidadMedida: 'gr',
          cantidadSolicitada: 20,
        },
      ],
    });
  });

  it('usa el conteo del listado aunque la respuesta no incluya detalle', () => {
    const solicitud = toSolicitudProduccion(
      makeSolicitudDto({ cantidad_productos: 2, detalle: undefined }),
    );
    expect(solicitud.cantidadProductos).toBe(2);
    expect(solicitud.detalle).toEqual([]);
  });

  it('keeps fecha_limite null when the solicitud no la tiene (opcional en el POST)', () => {
    expect(toSolicitudProduccion(makeSolicitudDto({ fecha_limite: null })).fechaLimite).toBeNull();
  });

  it('defaults detalle a [] cuando no viene en la respuesta, en vez de tirar (bug real reportado por el backend)', () => {
    // Respuesta real de POST /solicitudes-produccion (alta) que reprodujo
    // el backend — solo trae la cabecera, sin "detalle" (GET /:id si lo
    // embebe). Antes esto hacia que dto.detalle.map(...) tirara un
    // TypeError silencioso, mostrando "No se pudo crear la solicitud"
    // aunque el alta hubiera sido exitosa.
    const dtoSinDetalle: SolicitudProduccionDto = {
      id: 2,
      codigo: 'FR-SPR-001-261030-TEST',
      estado: 'pendiente',
      fecha_creacion: '2026-10-30T00:00:00.000Z',
      fecha_limite: '2026-11-11T00:00:00.000Z',
      solicitado_por: 'fec21c2a-79d1-4778-91b0-c5a55358e437',
      solicitado_por_nombre: "Admin Sistema Franco's",
      created_at: '2026-10-30T05:38:54.653Z',
      updated_at: '2026-10-30T05:38:54.653Z',
      // sin "detalle" a proposito
    };

    expect(() => toSolicitudProduccion(dtoSinDetalle)).not.toThrow();
    expect(toSolicitudProduccion(dtoSinDetalle)).toMatchObject({
      codigo: 'FR-SPR-001-261030-TEST',
      detalle: [],
    });
  });

  it('maps every page item and copies pagination metadata', () => {
    const result = toSolicitudesProduccionPagina({
      data: [makeSolicitudDto(), makeSolicitudDto({ id: 11, codigo: 'SPR-0091' })],
      meta: { total: 12, page: 2, limit: 10, total_pages: 2 },
    });

    expect(result.solicitudes).toHaveLength(2);
    expect(result.solicitudes[1]).toMatchObject({ id: 11, codigo: 'SPR-0091' });
    expect(result).toMatchObject({ total: 12, pagina: 2, totalPaginas: 2 });
  });

  it('builds the create request, parsing producto_terminado_id y cantidad_solicitada a number', () => {
    const form: SolicitudProduccionForm = {
      fechaLimite: '2026-09-20',
      filas: [
        { id: 1, productoTerminadoId: '256', cantidadSolicitada: '20' },
        { id: 2, productoTerminadoId: '257', cantidadSolicitada: '5' },
      ],
    };

    expect(toCrearSolicitudProduccionRequest('SPR-0091', form)).toEqual({
      codigo: 'SPR-0091',
      fecha_limite: '2026-09-20',
      detalle: [
        { producto_terminado_id: 256, cantidad_solicitada: 20 },
        { producto_terminado_id: 257, cantidad_solicitada: 5 },
      ],
    });
  });

  it('maps los indicadores, renombrando entregado/rechazado a completadas/canceladas (etiquetas pedidas por el usuario)', () => {
    expect(
      toResumenSolicitudesProduccion({
        pendiente: 2,
        en_proceso: 1,
        entregado: 3,
        rechazado: 1,
        total: 7,
      }),
    ).toEqual({
      pendientes: 2,
      enProceso: 1,
      completadas: 3,
      canceladas: 1,
    });
  });

  describe('etiquetaEstadoSolicitud / tonoEstadoSolicitud', () => {
    it('maps entregado/rechazado a las etiquetas visuales pedidas por el usuario (Entregado/Rechazado)', () => {
      expect(etiquetaEstadoSolicitud('pendiente')).toBe('Pendiente');
      expect(etiquetaEstadoSolicitud('en_proceso')).toBe('En proceso');
      expect(etiquetaEstadoSolicitud('entregado')).toBe('Entregado');
      expect(etiquetaEstadoSolicitud('rechazado')).toBe('Rechazado');
    });

    it('maps each estado to its badge tone', () => {
      expect(tonoEstadoSolicitud('pendiente')).toBe('warning');
      expect(tonoEstadoSolicitud('en_proceso')).toBe('info');
      expect(tonoEstadoSolicitud('entregado')).toBe('success');
      expect(tonoEstadoSolicitud('rechazado')).toBe('danger');
    });
  });

  describe('construirCodigoSolicitud', () => {
    it('builds the codigo as FR-SPR-[seq]-[YYMMDD], padding the sequence to 3 digits', () => {
      expect(construirCodigoSolicitud(1, new Date(2026, 9, 26))).toBe('FR-SPR-001-261026');
    });

    it('pads sequences above 9 and below 100 to 3 digits', () => {
      expect(construirCodigoSolicitud(42, new Date(2026, 0, 5))).toBe('FR-SPR-042-260105');
    });

    it('does not truncate a 3+ digit sequence', () => {
      expect(construirCodigoSolicitud(1234, new Date(2026, 0, 5))).toBe('FR-SPR-1234-260105');
    });
  });

  describe('siguienteSecuencialSolicitud', () => {
    const hoy = new Date(2026, 8, 12); // 2026-09-12
    const hoyIso = '2026-09-12';

    function solicitudDeHoy(codigo: string) {
      return { codigo, fechaCreacion: hoyIso };
    }

    it('computes the next sequence as the highest used today plus one, not a row count', () => {
      expect(
        siguienteSecuencialSolicitud(
          [solicitudDeHoy('FR-SPR-089-260912'), solicitudDeHoy('FR-SPR-090-260912')],
          hoy,
        ),
      ).toBe(91);
    });

    it('returns 1 when there are no solicitudes today', () => {
      expect(siguienteSecuencialSolicitud([], hoy)).toBe(1);
    });

    it('ignores solicitudes de otro dia al calcular el maximo (se reinicia por dia)', () => {
      expect(
        siguienteSecuencialSolicitud(
          [
            { codigo: 'FR-SPR-040-260911', fechaCreacion: '2026-09-11' },
            solicitudDeHoy('FR-SPR-001-260912'),
          ],
          hoy,
        ),
      ).toBe(2);
    });

    it('ignores codigos que no siguen el patron FR-SPR (datos legados)', () => {
      expect(
        siguienteSecuencialSolicitud(
          [solicitudDeHoy('LEGACY-001'), solicitudDeHoy('FR-SPR-012-260912')],
          hoy,
        ),
      ).toBe(13);
    });

    it('handles a fecha_creacion que viene como datetime completo, no solo YYYY-MM-DD', () => {
      expect(
        siguienteSecuencialSolicitud(
          [{ codigo: 'FR-SPR-005-260912', fechaCreacion: '2026-09-12T14:00:00.000Z' }],
          hoy,
        ),
      ).toBe(6);
    });
  });

  describe('calcularCambiosSolicitudProduccion', () => {
    function fila(
      overrides: Partial<FilaEditarSolicitudProduccion> = {},
    ): FilaEditarSolicitudProduccion {
      return {
        id: 1,
        detalleId: 1,
        productoTerminadoId: '256',
        cantidadSolicitada: '20',
        cantidadOriginal: '20',
        ...overrides,
      };
    }

    it('returns everything empty/null when nothing changed', () => {
      expect(calcularCambiosSolicitudProduccion('2026-09-13', '2026-09-13', [1], [fila()])).toEqual(
        {
          fechaLimite: null,
          altas: [],
          actualizaciones: [],
          bajas: [],
        },
      );
    });

    it('detects a fecha_limite change', () => {
      const cambios = calcularCambiosSolicitudProduccion('2026-09-13', '2026-09-20', [1], [fila()]);
      expect(cambios.fechaLimite).toBe('2026-09-20');
    });

    it('treats a fila with detalleId null as an alta, parsing ids/cantidades a number', () => {
      const cambios = calcularCambiosSolicitudProduccion(
        '2026-09-13',
        '2026-09-13',
        [1],
        [
          fila(),
          {
            id: 2,
            detalleId: null,
            productoTerminadoId: '257',
            cantidadSolicitada: '5',
            cantidadOriginal: null,
          },
        ],
      );
      expect(cambios.altas).toEqual([{ producto_terminado_id: 257, cantidad_solicitada: 5 }]);
    });

    it('detects a cantidad change on an existing fila as an actualizacion', () => {
      const cambios = calcularCambiosSolicitudProduccion(
        '2026-09-13',
        '2026-09-13',
        [1],
        [fila({ cantidadSolicitada: '30' })],
      );
      expect(cambios.actualizaciones).toEqual([{ detalleId: 1, cantidadSolicitada: 30 }]);
    });

    it('does not report an actualizacion when the cantidad is unchanged', () => {
      const cambios = calcularCambiosSolicitudProduccion('2026-09-13', '2026-09-13', [1], [fila()]);
      expect(cambios.actualizaciones).toEqual([]);
    });

    it('treats an original detalleId missing from las filas actuales as a baja', () => {
      const cambios = calcularCambiosSolicitudProduccion(
        '2026-09-13',
        '2026-09-13',
        [1, 2],
        [fila()],
      );
      expect(cambios.bajas).toEqual([2]);
    });

    it('combines fecha_limite, alta, actualizacion y baja en un solo diff', () => {
      const cambios = calcularCambiosSolicitudProduccion(
        '2026-09-13',
        '2026-09-25',
        [1, 2],
        [
          fila({ cantidadSolicitada: '99' }),
          {
            id: 3,
            detalleId: null,
            productoTerminadoId: '300',
            cantidadSolicitada: '7',
            cantidadOriginal: null,
          },
        ],
      );
      expect(cambios).toEqual({
        fechaLimite: '2026-09-25',
        altas: [{ producto_terminado_id: 300, cantidad_solicitada: 7 }],
        actualizaciones: [{ detalleId: 1, cantidadSolicitada: 99 }],
        bajas: [2],
      });
    });
  });
});
