import {
  IndicadoresSolicitudesProduccionDto,
  SolicitudProduccionDto,
  SolicitudesProduccionPageDto,
} from '../interfaces/solicitud-produccion-dto.interface';
import {
  etiquetaAccionSiguienteEstado,
  etiquetaEstadoSolicitud,
  puedeRechazarSolicitud,
  siguienteEstadoSolicitud,
  toSolicitudProduccion,
  toSolicitudesProduccionPagina,
  toResumenSolicitudesProduccion,
  tonoEstadoSolicitud,
} from './solicitud-produccion.mapper';

const SOLICITUD_DTO: SolicitudProduccionDto = {
  id: 10,
  codigo: 'FR-SPR-090-260912',
  estado: 'pendiente',
  fecha_creacion: '2026-09-12',
  fecha_limite: '2026-09-13',
  solicitado_por: 'uuid-1',
  solicitado_por_nombre: 'M. Quispe',
  created_at: '2026-09-12T00:00:00.000Z',
  updated_at: '2026-09-12T00:00:00.000Z',
  detalle: [
    {
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
    },
  ],
};

describe('solicitud-produccion.mapper (Produccion)', () => {
  it('etiquetaEstadoSolicitud y tonoEstadoSolicitud mapean los 4 estados', () => {
    expect(etiquetaEstadoSolicitud('pendiente')).toBe('Pendiente');
    expect(etiquetaEstadoSolicitud('en_proceso')).toBe('En proceso');
    expect(etiquetaEstadoSolicitud('entregado')).toBe('Entregado');
    expect(etiquetaEstadoSolicitud('rechazado')).toBe('Rechazado');

    expect(tonoEstadoSolicitud('pendiente')).toBe('warning');
    expect(tonoEstadoSolicitud('en_proceso')).toBe('info');
    expect(tonoEstadoSolicitud('entregado')).toBe('success');
    expect(tonoEstadoSolicitud('rechazado')).toBe('danger');
  });

  it('toSolicitudProduccion mapea detalle y usa detalle.length cuando no viene cantidad_productos', () => {
    const resultado = toSolicitudProduccion(SOLICITUD_DTO);
    expect(resultado.cantidadProductos).toBe(1);
    expect(resultado.detalle).toEqual([
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
    ]);
  });

  it('toSolicitudProduccion deja detalle en [] cuando el DTO no lo trae', () => {
    const { detalle, ...sinDetalle } = SOLICITUD_DTO;
    void detalle;
    expect(toSolicitudProduccion(sinDetalle).detalle).toEqual([]);
  });

  it('toSolicitudesProduccionPagina mapea data + meta', () => {
    const pageDto: SolicitudesProduccionPageDto = {
      data: [SOLICITUD_DTO],
      meta: { total: 1, page: 1, limit: 10, total_pages: 1 },
    };
    const resultado = toSolicitudesProduccionPagina(pageDto);
    expect(resultado.solicitudes).toHaveLength(1);
    expect(resultado.total).toBe(1);
    expect(resultado.pagina).toBe(1);
    expect(resultado.totalPaginas).toBe(1);
  });

  it('toResumenSolicitudesProduccion renombra los 4 estados', () => {
    const dto: IndicadoresSolicitudesProduccionDto = {
      pendiente: 2,
      en_proceso: 1,
      entregado: 3,
      rechazado: 1,
      total: 7,
    };
    expect(toResumenSolicitudesProduccion(dto)).toEqual({
      pendientes: 2,
      enProceso: 1,
      completadas: 3,
      canceladas: 1,
    });
  });

  it('siguienteEstadoSolicitud avanza pendiente -> en_proceso -> entregado -> null', () => {
    expect(siguienteEstadoSolicitud('pendiente')).toBe('en_proceso');
    expect(siguienteEstadoSolicitud('en_proceso')).toBe('entregado');
    expect(siguienteEstadoSolicitud('entregado')).toBeNull();
    expect(siguienteEstadoSolicitud('rechazado')).toBeNull();
  });

  it('etiquetaAccionSiguienteEstado devuelve el texto del boton o null', () => {
    expect(etiquetaAccionSiguienteEstado('pendiente')).toBe('Iniciar producción');
    expect(etiquetaAccionSiguienteEstado('en_proceso')).toBe('Marcar entregado');
    expect(etiquetaAccionSiguienteEstado('entregado')).toBeNull();
    expect(etiquetaAccionSiguienteEstado('rechazado')).toBeNull();
  });

  it('puedeRechazarSolicitud solo es true en pendiente', () => {
    expect(puedeRechazarSolicitud('pendiente')).toBe(true);
    expect(puedeRechazarSolicitud('en_proceso')).toBe(false);
    expect(puedeRechazarSolicitud('entregado')).toBe(false);
    expect(puedeRechazarSolicitud('rechazado')).toBe(false);
  });
});
