import { UbicacionCliente } from './ubicacion.interface';

// Modelo y reglas de Cliente. Los valores de los enums son los del backend
// (minúsculas); las etiquetas en español para la pantalla están en los *_LABEL.
export type TipoDocumento = 'dni' | 'ce' | 'pasaporte' | 'ruc';
export type TipoCliente = 'persona_natural' | 'empresa';
export type CategoriaCliente = 'minorista' | 'mayorista';

export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  dni: 'DNI',
  ce: 'Carné de Extranjería',
  pasaporte: 'Pasaporte',
  ruc: 'RUC',
};

export const TIPO_CLIENTE_LABEL: Record<TipoCliente, string> = {
  persona_natural: 'Persona natural',
  empresa: 'Empresa',
};

export const CATEGORIA_LABEL: Record<CategoriaCliente, string> = {
  minorista: 'Minorista',
  mayorista: 'Mayorista',
};

// En la UI los datos opcionales que el backend manda como null se muestran como
// texto vacío, por eso aquí son string y no string | null.
export interface Cliente {
  id: string;
  /** Código visible, por ejemplo "CLI-000001". */
  codigo: string;
  personaId: string;
  tipoCliente: TipoCliente;
  razonSocial: string;
  categoria: CategoriaCliente;
  estado: boolean;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  telefono: string;
  /** AAAA-MM-DD (formato de <input type="date">), o vacío. */
  fechaNacimiento: string;
  direccion: string;
  /** null si el cliente aún no registró su ubicación. */
  ubicacion: UbicacionCliente | null;
  email: string;
  // Solo existen si el backend los envía; el detalle oculta el campo que falte.
  /** Usuario de la cuenta de acceso. */
  usuario?: string;
  /** true = correo verificado; false = verificación enviada y pendiente. */
  correoVerificado?: boolean;
}

export interface ClientesPagina {
  clientes: Cliente[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/** Resultado del alta: el backend crea la cuenta con credenciales por defecto. */
export interface ClienteRegistrado {
  usuario: string;
  email: string;
}

// Campos del alta/edición. Todo es texto, como lo escribe el operador. El tipo
// de cliente (persona natural / empresa) no se elige: se deriva del documento
// (ver tipoClientePorDocumento). En una empresa, nombres y apellidos son los
// del contacto, que el backend guarda como la persona del cliente.
export interface ClienteForm {
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  razonSocial: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  /** Códigos del catálogo de ubigeo; vacíos si aún no se eligen. */
  departamentoId: string;
  provinciaId: string;
  distritoId: string;
  direccion: string;
  categoria: CategoriaCliente;
  telefono: string;
  email: string;
}

export function clienteFormVacio(): ClienteForm {
  return {
    tipoDocumento: 'dni',
    numeroDocumento: '',
    razonSocial: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    departamentoId: '',
    provinciaId: '',
    distritoId: '',
    direccion: '',
    categoria: 'minorista',
    telefono: '',
    email: '',
  };
}

export function clienteAForm(cliente: Cliente): ClienteForm {
  return {
    tipoDocumento: cliente.tipoDocumento,
    numeroDocumento: cliente.numeroDocumento,
    razonSocial: cliente.razonSocial,
    nombres: cliente.nombres,
    apellidoPaterno: cliente.apellidoPaterno,
    apellidoMaterno: cliente.apellidoMaterno,
    fechaNacimiento: cliente.fechaNacimiento,
    departamentoId: cliente.ubicacion?.departamento.id ?? '',
    provinciaId: cliente.ubicacion?.provincia.id ?? '',
    distritoId: cliente.ubicacion?.distrito.id ?? '',
    direccion: cliente.direccion,
    categoria: cliente.categoria,
    telefono: cliente.telefono,
    email: cliente.email,
  };
}

/** Razón social si es empresa; "nombres apellidos" si es persona natural. */
export function nombreCliente(
  cliente: Pick<
    Cliente,
    'tipoCliente' | 'razonSocial' | 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'
  >,
): string {
  if (cliente.tipoCliente === 'empresa') {
    return cliente.razonSocial;
  }
  return [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno]
    .filter(Boolean)
    .join(' ');
}

/** RUC que empieza en "20" = empresa; cualquier otro caso (incluido RUC 10) = persona natural. */
export function tipoClientePorDocumento(
  tipoDocumento: TipoDocumento,
  numeroDocumento: string,
): TipoCliente {
  return tipoDocumento === 'ruc' && numeroDocumento.startsWith('20')
    ? 'empresa'
    : 'persona_natural';
}

/**
 * Al pasar de persona natural a empresa (o al revés) se vacían los campos que
 * el otro tipo no usa, para no mandar datos que ya no se ven en el formulario.
 */
export function limpiarCamposDeOtroTipo(form: ClienteForm, tipo: TipoCliente): ClienteForm {
  return tipo === 'empresa'
    ? {
        ...form,
        fechaNacimiento: '',
        departamentoId: '',
        provinciaId: '',
        distritoId: '',
        direccion: '',
      }
    : { ...form, razonSocial: '' };
}

// Mismos formatos que valida el backend (numero-documento.validator.ts).
const FORMATO_DOCUMENTO: Record<TipoDocumento, { regex: RegExp; mensaje: string }> = {
  dni: { regex: /^\d{8}$/, mensaje: 'el DNI debe tener 8 dígitos' },
  ruc: { regex: /^\d{11}$/, mensaje: 'el RUC debe tener 11 dígitos' },
  ce: {
    regex: /^[a-zA-Z0-9]{9,12}$/,
    mensaje: 'el carné de extranjería debe tener de 9 a 12 letras o números',
  },
  pasaporte: {
    regex: /^[a-zA-Z0-9]{6,12}$/,
    mensaje: 'el pasaporte debe tener de 6 a 12 letras o números',
  },
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Devuelve los campos que faltan o están mal, en español, listos para mostrar.
 * Al editar, el correo no se valida: pertenece a la cuenta de acceso y no se
 * modifica desde este formulario.
 */
export function validarClienteForm(form: ClienteForm, editando: boolean): string[] {
  const errores: string[] = [];
  const documento = form.numeroDocumento.trim();
  const tipo = tipoClientePorDocumento(form.tipoDocumento, documento);
  const formato = FORMATO_DOCUMENTO[form.tipoDocumento];

  if (!documento) {
    errores.push('número de documento');
  } else if (!formato.regex.test(documento)) {
    errores.push(formato.mensaje);
  } else if (form.tipoDocumento === 'ruc' && !['10', '20'].includes(documento.slice(0, 2))) {
    errores.push('el RUC debe iniciar en 10 o 20');
  }

  if (tipo === 'empresa') {
    if (!form.razonSocial.trim()) {
      errores.push('razón social');
    } else if (form.razonSocial.trim().length > 200) {
      errores.push('la razón social no puede pasar de 200 caracteres');
    }
  }

  const etiquetaPersona = tipo === 'empresa' ? 'del contacto' : '';
  if (!form.nombres.trim()) {
    errores.push(`nombres ${etiquetaPersona}`.trim());
  }
  if (!form.apellidoPaterno.trim()) {
    errores.push(`apellido paterno ${etiquetaPersona}`.trim());
  }
  if (!form.apellidoMaterno.trim()) {
    errores.push(`apellido materno ${etiquetaPersona}`.trim());
  }

  if (tipo === 'persona_natural') {
    if (!form.fechaNacimiento) {
      errores.push('fecha de nacimiento');
    }
    if (!form.departamentoId) {
      errores.push('departamento');
    }
    if (!form.provinciaId) {
      errores.push('provincia');
    }
    if (!form.distritoId) {
      errores.push('distrito');
    }
    if (!form.direccion.trim()) {
      errores.push('dirección');
    }
  }

  if (!form.telefono.trim()) {
    errores.push('teléfono');
  } else if (!/^\d{9}$/.test(form.telefono.trim())) {
    errores.push('el teléfono debe tener 9 dígitos');
  }

  if (!editando) {
    const email = form.email.trim();
    if (!email) {
      errores.push(tipo === 'empresa' ? 'correo electrónico del contacto' : 'correo');
    } else if (!EMAIL_RE.test(email)) {
      errores.push('el correo no tiene un formato válido');
    } else if (email.length > 150) {
      errores.push('el correo no puede pasar de 150 caracteres');
    }
  }

  return errores;
}
