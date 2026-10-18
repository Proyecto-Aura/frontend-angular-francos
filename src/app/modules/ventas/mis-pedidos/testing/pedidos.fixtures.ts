import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../../../environments/environment';
import { ProductoPresentacionFilaDto } from '../../catalogo/interfaces/producto-dto.interface';
import {
  ClienteDto,
  PageDto,
  PedidoDetalleDto,
  PedidoResumenDto,
  PersonaDto,
} from '../interfaces/pedido-dto.interface';
import { PedidoFormModel, PresentacionOpcion } from '../interfaces/pedido.interface';

export const API = environment.apiUrl;

export const page = <T>(data: T[], total = data.length, totalPages = 1): PageDto<T> => ({
  data,
  meta: { total, page: 1, limit: 100, total_pages: totalPages },
});

export const CLIENTE_ID = 'c7b2e2e3-2222-4d2b-8b1f-4c6c3a7a0002';

export function makeResumenDto(overrides: Partial<PedidoResumenDto> = {}): PedidoResumenDto {
  return {
    id: 1,
    codigo: 'PED-000001',
    cliente: { id: CLIENTE_ID, nombre: 'Rosa Elena Quispe Huamán' },
    metodo_pago: 'efectivo',
    total: 165.6,
    tipo_entrega: 'delivery',
    estado: 'confirmado',
    origen: 'manual',
    created_at: '2026-10-17T15:00:00.000Z',
    ...overrides,
  };
}

export function makeDetalleDto(overrides: Partial<PedidoDetalleDto> = {}): PedidoDetalleDto {
  return {
    id: 1,
    codigo: 'PED-000001',
    cliente: { id: CLIENTE_ID, nombre: 'Rosa Elena Quispe Huamán' },
    origen: 'manual',
    estado: 'confirmado',
    tipo_entrega: 'delivery',
    direccion_entrega: 'Av. La Marina 1450, San Miguel',
    total: 165.6,
    created_at: '2026-10-17T15:00:00.000Z',
    updated_at: '2026-10-17T15:00:00.000Z',
    items: [
      {
        id: 1,
        producto_presentacion_id: 10,
        sku: 'FR-P1-PR1',
        producto: 'Chifles clásicos',
        presentacion: '100 gr',
        cantidad: 30,
        precio_unitario: 5.5,
        precio_aplicado: 4.2,
        subtotal: 126,
      },
      {
        id: 2,
        producto_presentacion_id: 11,
        sku: 'FR-P1-PR2',
        producto: 'Chifles clásicos',
        presentacion: '200 gr',
        cantidad: 4,
        precio_unitario: 9.9,
        precio_aplicado: 9.9,
        subtotal: 39.6,
      },
    ],
    pago: {
      metodo_pago: 'efectivo',
      monto: 165.6,
      numero_operacion: null,
      fecha_pago: '2026-10-17T15:00:00.000Z',
      comprobante: null,
    },
    ...overrides,
  };
}

export const clientesDto: ClienteDto[] = [
  {
    id: CLIENTE_ID,
    persona_id: 'p-1',
    tipo_cliente: 'persona_natural',
    razon_social: null,
    categoria_cliente: 'minorista',
    estado: true,
  },
  {
    id: 'cli-empresa',
    persona_id: 'p-2',
    tipo_cliente: 'empresa',
    razon_social: 'Distribuidora Andes S.A.C.',
    categoria_cliente: 'mayorista',
    estado: true,
  },
  {
    id: 'cli-inactivo',
    persona_id: 'p-3',
    tipo_cliente: 'persona_natural',
    razon_social: null,
    categoria_cliente: 'minorista',
    estado: false,
  },
];

const persona = (id: string, nombres: string, documento: string, direccion: string | null) =>
  ({
    id,
    nombres,
    apellido_paterno: 'Quispe',
    apellido_materno: 'Huamán',
    tipo_documento: 'dni',
    numero_documento: documento,
    direccion,
    estado: true,
  }) satisfies PersonaDto;

export const personasDto: PersonaDto[] = [
  persona('p-1', 'Rosa Elena', '45288977', 'Jr. Las Magnolias 312, Surco'),
  persona('p-2', 'Jorge Luis', '20548712345', null),
  persona('p-3', 'Ana', '11111111', null),
];

export function makeFilaDto(
  id: number,
  overrides: Partial<ProductoPresentacionFilaDto> = {},
): ProductoPresentacionFilaDto {
  return {
    id,
    sku: `FR-P1-PR${id}`,
    precio_unitario: 5.5,
    precio_mayorista: 4.2,
    umbral_mayorista: 24,
    producto_id: 1,
    presentacion_id: id,
    imagen_url: null,
    slug: null,
    estado: true,
    visible_portal_b: false,
    producto: {
      id: 1,
      nombre: 'Chifles clásicos',
      descripcion: null,
      destacado: false,
      estado: true,
      categoria: { id: 1, nombre: 'Chifles' },
    },
    presentacion: { id, cantidad: 100, unidad_medida: 'gr', descripcion: null },
    producto_terminado: null,
    promocion_vigente: null,
    ...overrides,
  } as ProductoPresentacionFilaDto;
}

export const presentacionesDto: ProductoPresentacionFilaDto[] = [
  makeFilaDto(10),
  makeFilaDto(11, {
    precio_unitario: 9.9,
    precio_mayorista: null,
    umbral_mayorista: null,
    presentacion: { id: 11, cantidad: 200, unidad_medida: 'gr', descripcion: null },
  }),
  makeFilaDto(12, { estado: false }),
];

export const presentacionOpciones: PresentacionOpcion[] = [
  {
    id: 10,
    sku: 'FR-P1-PR10',
    nombre: 'Chifles clásicos 100 gr',
    precioUnit: 5.5,
    precioMayor: 4.2,
    umbral: 24,
  },
  {
    id: 11,
    sku: 'FR-P1-PR11',
    nombre: 'Chifles clásicos 200 gr',
    precioUnit: 9.9,
    precioMayor: null,
    umbral: null,
  },
];

export function makeFormValido(overrides: Partial<PedidoFormModel> = {}): PedidoFormModel {
  return {
    clienteId: CLIENTE_ID,
    items: [
      { presentacionId: '10', cantidad: '30' },
      { presentacionId: '11', cantidad: '4' },
    ],
    tipoEntrega: 'delivery',
    direccion: 'Av. La Marina 1450, San Miguel',
    metodoPago: 'efectivo',
    ...overrides,
  };
}

/** Responde las 3 listas que pide el formulario de registro. */
export function flushOpcionesRegistro(httpMock: HttpTestingController): void {
  httpMock.expectOne((r) => r.url === `${API}/clientes`).flush(page(clientesDto));
  httpMock.expectOne((r) => r.url === `${API}/personas`).flush(page(personasDto));
  httpMock
    .expectOne((r) => r.url === `${API}/producto-presentaciones`)
    .flush(page(presentacionesDto));
}
