import {
  IndicadoresSolicitudesInsumoDto,
  SolicitudInsumoDto,
} from '../interfaces/solicitud-insumo-dto.interface';
import { FilaEditarSolicitudInsumo } from '../interfaces/solicitud-insumo.interface';
import {
  calcularCambiosSolicitudInsumo,
  construirCodigoSolicitudInsumo,
  etiquetaEstadoSolicitudInsumo,
  puedeRechazarSolicitudInsumo,
  siguienteEstadoSolicitudInsumo,
  siguienteSecuencialSolicitudInsumo,
  toCrearSolicitudInsumoRequest,
  toResumenSolicitudesInsumo,
  toSolicitudInsumo,
  toSolicitudesInsumoPagina,
  tonoEstadoSolicitudInsumo,
} from './solicitud-insumo.mapper';

const SOLICITUD_DTO: SolicitudInsumoDto = {
  id: 10,
  codigo_solicitud: 'FR-SIN-001-261104',
  solicitud_produccion_id: 6,
  estado: 'pendiente',
  fecha_creacion: '2026-11-04',
  fecha_limite: '2026-11-15',
  solicitado_por: 'uuid-1',
  solicitado_por_nombre: 'Admin Sistema',
  created_at: '2026-11-04T00:00:00.000Z',
  updated_at: '2026-11-04T00:00:00.000Z',
  detalle: [
    {
      id: 1,
      insumo_id: 12,
      insumo_sku: 'FR-INS-012',
      insumo_nombre: 'Harina de trigo',
      insumo_unidad_medida: 'kg',
      cantidad_solicitada: 50,
      created_at: '2026-11-04T00:00:00.000Z',
    },
  ],
};

describe('solicitud-insumo.mapper (Produccion)', () => {
  it('etiquetaEstadoSolicitudInsumo y tonoEstadoSolicitudInsumo mapean los 4 estados', () => {
    expect(etiquetaEstadoSolicitudInsumo('pendiente')).toBe('Pendiente');
    expect(tonoEstadoSolicitudInsumo('pendiente')).toBe('warning');
    expect(etiquetaEstadoSolicitudInsumo('en_proceso')).toBe('En proceso');
    expect(tonoEstadoSolicitudInsumo('en_proceso')).toBe('info');
    expect(etiquetaEstadoSolicitudInsumo('entregado')).toBe('Entregado');
    expect(tonoEstadoSolicitudInsumo('entregado')).toBe('success');
    expect(etiquetaEstadoSolicitudInsumo('rechazado')).toBe('Rechazado');
    expect(tonoEstadoSolicitudInsumo('rechazado')).toBe('danger');
  });

  it('toSolicitudInsumo mapea cabecera y detalle', () => {
    const resultado = toSolicitudInsumo(SOLICITUD_DTO);

    expect(resultado).toEqual({
      id: 10,
      codigo: 'FR-SIN-001-261104',
      solicitudProduccionId: 6,
      cantidadInsumos: 1,
      estado: 'pendiente',
      fechaCreacion: '2026-11-04',
      fechaLimite: '2026-11-15',
      solicitadoPorNombre: 'Admin Sistema',
      detalle: [
        {
          id: 1,
          insumoId: 12,
          sku: 'FR-INS-012',
          insumoNombre: 'Harina de trigo',
          unidadMedida: 'kg',
          cantidadSolicitada: 50,
        },
      ],
    });
  });

  it('toSolicitudInsumo deja detalle en [] cuando el DTO no lo trae (bug real analogo al de solicitud de produccion)', () => {
    const { detalle, ...sinDetalle } = SOLICITUD_DTO;
    void detalle;
    expect(toSolicitudInsumo(sinDetalle).detalle).toEqual([]);
  });

  it('toSolicitudesInsumoPagina mapea data + meta', () => {
    const resultado = toSolicitudesInsumoPagina({
      data: [SOLICITUD_DTO],
      meta: { total: 1, page: 1, limit: 10, total_pages: 1 },
    });

    expect(resultado.solicitudes).toHaveLength(1);
    expect(resultado).toMatchObject({ total: 1, pagina: 1, totalPaginas: 1 });
  });

  it('toCrearSolicitudInsumoRequest arma el body con codigo_solicitud y detalle mapeado a insumo_id', () => {
    const request = toCrearSolicitudInsumoRequest('FR-SIN-001-261104', {
      fechaLimite: '2026-11-15',
      filas: [{ id: 1, insumoId: '12', cantidadSolicitada: '50' }],
    });

    expect(request).toEqual({
      codigo_solicitud: 'FR-SIN-001-261104',
      fecha_limite: '2026-11-15',
      detalle: [{ insumo_id: 12, cantidad_solicitada: 50 }],
    });
  });

  it('toCrearSolicitudInsumoRequest incluye solicitud_produccion_id solo cuando se pasa', () => {
    const request = toCrearSolicitudInsumoRequest(
      'FR-SIN-001-261104',
      { fechaLimite: '2026-11-15', filas: [{ id: 1, insumoId: '12', cantidadSolicitada: '50' }] },
      6,
    );

    expect(request).toMatchObject({ solicitud_produccion_id: 6 });
  });

  it('toResumenSolicitudesInsumo renombra los 4 estados', () => {
    const dto: IndicadoresSolicitudesInsumoDto = {
      pendiente: 2,
      en_proceso: 1,
      entregado: 3,
      rechazado: 1,
      total: 7,
    };

    expect(toResumenSolicitudesInsumo(dto)).toEqual({
      pendientes: 2,
      enProceso: 1,
      completadas: 3,
      canceladas: 1,
    });
  });

  it('construirCodigoSolicitudInsumo arma FR-SIN-[000]-[YYMMDD]', () => {
    expect(construirCodigoSolicitudInsumo(1, new Date(2026, 10, 4))).toBe('FR-SIN-001-261104');
    expect(construirCodigoSolicitudInsumo(42, new Date(2026, 0, 5))).toBe('FR-SIN-042-260105');
  });

  it('siguienteSecuencialSolicitudInsumo usa el maximo de los codigos recibidos', () => {
    const resultado = siguienteSecuencialSolicitudInsumo([
      { codigo: 'FR-SIN-001-261104' },
      { codigo: 'FR-SIN-003-261104' },
    ]);

    expect(resultado).toBe(4);
  });

  it('siguienteSecuencialSolicitudInsumo devuelve 1 cuando no hay solicitudes', () => {
    expect(siguienteSecuencialSolicitudInsumo([])).toBe(1);
  });

  it('siguienteEstadoSolicitudInsumo avanza pendiente->en_proceso->entregado, null en terminales', () => {
    expect(siguienteEstadoSolicitudInsumo('pendiente')).toBe('en_proceso');
    expect(siguienteEstadoSolicitudInsumo('en_proceso')).toBe('entregado');
    expect(siguienteEstadoSolicitudInsumo('entregado')).toBeNull();
    expect(siguienteEstadoSolicitudInsumo('rechazado')).toBeNull();
  });

  it('puedeRechazarSolicitudInsumo solo es true en pendiente', () => {
    expect(puedeRechazarSolicitudInsumo('pendiente')).toBe(true);
    expect(puedeRechazarSolicitudInsumo('en_proceso')).toBe(false);
    expect(puedeRechazarSolicitudInsumo('entregado')).toBe(false);
    expect(puedeRechazarSolicitudInsumo('rechazado')).toBe(false);
  });

  describe('calcularCambiosSolicitudInsumo', () => {
    const filaExistente: FilaEditarSolicitudInsumo = {
      id: 1,
      detalleId: 100,
      insumoId: '12',
      cantidadSolicitada: '50',
      cantidadOriginal: '50',
    };

    it('no reporta cambios cuando nada cambio', () => {
      const cambios = calcularCambiosSolicitudInsumo(
        '2026-11-15',
        '2026-11-15',
        [100],
        [filaExistente],
      );

      expect(cambios).toEqual({ fechaLimite: null, altas: [], actualizaciones: [], bajas: [] });
    });

    it('detecta cambio de fecha limite', () => {
      const cambios = calcularCambiosSolicitudInsumo(
        '2026-11-15',
        '2026-11-20',
        [100],
        [filaExistente],
      );

      expect(cambios.fechaLimite).toBe('2026-11-20');
    });

    it('detecta una fila nueva como alta', () => {
      const filaNueva: FilaEditarSolicitudInsumo = {
        id: 2,
        detalleId: null,
        insumoId: '13',
        cantidadSolicitada: '20',
        cantidadOriginal: null,
      };
      const cambios = calcularCambiosSolicitudInsumo(
        '2026-11-15',
        '2026-11-15',
        [100],
        [filaExistente, filaNueva],
      );

      expect(cambios.altas).toEqual([{ insumo_id: 13, cantidad_solicitada: 20 }]);
    });

    it('detecta cambio de cantidad en una fila existente como actualizacion', () => {
      const filaModificada = { ...filaExistente, cantidadSolicitada: '80' };
      const cambios = calcularCambiosSolicitudInsumo(
        '2026-11-15',
        '2026-11-15',
        [100],
        [filaModificada],
      );

      expect(cambios.actualizaciones).toEqual([{ detalleId: 100, cantidadSolicitada: 80 }]);
    });

    it('detecta una fila quitada como baja', () => {
      const cambios = calcularCambiosSolicitudInsumo(
        '2026-11-15',
        '2026-11-15',
        [100, 101],
        [filaExistente],
      );

      expect(cambios.bajas).toEqual([101]);
    });
  });
});
