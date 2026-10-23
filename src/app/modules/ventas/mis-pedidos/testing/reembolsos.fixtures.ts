import { ReembolsoDetalleDto, ReembolsoResumenDto } from '../interfaces/reembolso-dto.interface';

export function makeReembolsoResumenDto(
  overrides: Partial<ReembolsoResumenDto> = {},
): ReembolsoResumenDto {
  return {
    id: 1,
    codigo: 'SOL-000001',
    pedido: { id: 4, codigo: 'PED-000004' },
    cliente: { nombre: 'Rosa Elena Quispe Huamán' },
    metodo_pago: 'culqi',
    monto: 1700,
    estado: 'pendiente',
    fecha_solicitud: '2026-10-17T15:00:00.000Z',
    ...overrides,
  };
}

export function makeReembolsoDetalleDto(
  overrides: Partial<ReembolsoDetalleDto> = {},
): ReembolsoDetalleDto {
  return {
    ...makeReembolsoResumenDto(),
    motivo_cliente:
      'El pedido llegó con 12 packs rotos y el cliente solicita la devolución del importe pagado.',
    evidencia: {
      nombre: 'evidencia-packs-rotos.pdf',
      url: 'http://localhost:9000/francos-docs/reembolsos/SOL-000001/evidencia-packs-rotos.pdf?firma',
    },
    motivo_rechazo: null,
    fecha_resolucion: null,
    ...overrides,
  };
}
