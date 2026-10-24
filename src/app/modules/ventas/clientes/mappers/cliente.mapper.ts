import {
  ActualizarClienteRequestDto,
  ClienteDto,
  ClientesPageDto,
  RegistrarClienteRequestDto,
  RegistroClienteResponseDto,
} from '../interfaces/cliente-dto.interface';
import {
  Cliente,
  ClienteForm,
  ClienteRegistrado,
  ClientesPagina,
  tipoClientePorDocumento,
} from '../interfaces/cliente.interface';

export function toCliente(dto: ClienteDto): Cliente {
  return {
    id: dto.id,
    codigo: dto.codigo,
    personaId: dto.persona_id,
    tipoCliente: dto.tipo_cliente,
    razonSocial: dto.razon_social ?? '',
    categoria: dto.categoria_cliente,
    estado: dto.estado,
    nombres: dto.nombres,
    apellidoPaterno: dto.apellido_paterno,
    apellidoMaterno: dto.apellido_materno,
    tipoDocumento: dto.tipo_documento,
    numeroDocumento: dto.numero_documento,
    telefono: dto.telefono ?? '',
    // El backend manda la fecha como ISO completo; el <input type="date"> pide AAAA-MM-DD.
    fechaNacimiento: dto.fecha_nacimiento ? dto.fecha_nacimiento.slice(0, 10) : '',
    direccion: dto.direccion ?? '',
    ubicacion: dto.ubicacion
      ? {
          departamento: { ...dto.ubicacion.departamento },
          provincia: { ...dto.ubicacion.provincia },
          distrito: { ...dto.ubicacion.distrito },
        }
      : null,
    email: dto.email ?? '',
  };
}

export function toClientesPagina(pageDto: ClientesPageDto): ClientesPagina {
  return {
    clientes: pageDto.data.map(toCliente),
    total: pageDto.meta.total,
    pagina: pageDto.meta.page,
    totalPaginas: pageDto.meta.total_pages,
  };
}

export function toClienteRegistrado(dto: RegistroClienteResponseDto): ClienteRegistrado {
  return { usuario: dto.username, email: dto.email };
}

// Campos compartidos por el alta y la edición. Los opcionales vacíos se omiten
// (el backend rechaza null) y razon_social solo va si es empresa: al pasar a
// persona natural el backend la limpia por su cuenta.
function datosDelCliente(form: ClienteForm): Omit<RegistrarClienteRequestDto, 'email'> {
  const numeroDocumento = form.numeroDocumento.trim();
  const tipoCliente = tipoClientePorDocumento(form.tipoDocumento, numeroDocumento);
  const telefono = form.telefono.trim();
  const direccion = form.direccion.trim();
  const razonSocial = form.razonSocial.trim();

  return {
    nombres: form.nombres.trim(),
    apellido_paterno: form.apellidoPaterno.trim(),
    apellido_materno: form.apellidoMaterno.trim(),
    tipo_documento: form.tipoDocumento,
    numero_documento: numeroDocumento,
    ...(telefono ? { telefono } : {}),
    ...(form.fechaNacimiento ? { fecha_nacimiento: form.fechaNacimiento } : {}),
    ...(direccion ? { direccion } : {}),
    ...(form.distritoId ? { distrito_id: form.distritoId } : {}),
    tipo_cliente: tipoCliente,
    ...(tipoCliente === 'empresa' && razonSocial ? { razon_social: razonSocial } : {}),
    categoria_cliente: form.categoria,
  };
}

export function toRegistrarClienteRequest(form: ClienteForm): RegistrarClienteRequestDto {
  return {
    ...datosDelCliente(form),
    email: form.email.trim(),
  };
}

export function toActualizarClienteRequest(form: ClienteForm): ActualizarClienteRequestDto {
  return datosDelCliente(form);
}
