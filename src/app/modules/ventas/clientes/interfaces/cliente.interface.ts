// Modelo y reglas de Cliente — portados 1:1 desde la lógica real del diseño
// (FrancoSPortalEmpresarialDesignSystem), no del Excel de requisitos ni de la
// HU en texto: el diseño es la fuente de verdad que confirmó el equipo.

export type TipoDocumento = 'DNI' | 'CE' | 'Pasaporte' | 'RUC';
export type TipoPersona = 'natural' | 'empresa';
export type TipoCliente = 'Mayorista' | 'Minorista';
export type EstadoCliente = 'Activo' | 'Inactivo';

export const LARGO_DOC: Record<TipoDocumento, number> = { DNI: 8, CE: 9, Pasaporte: 9, RUC: 11 };

// Campos que llena el operador en el alta/edición. `persona` se deriva de
// tipoDoc + doc (ver personaPorDocumento) — nunca lo elige el operador.
export interface ClienteFormModel {
  tipoDoc: TipoDocumento;
  persona: TipoPersona;
  doc: string;
  // Persona natural (DNI / CE / Pasaporte / RUC 10)
  nombres: string;
  apellidos: string;
  nacimiento: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  // Empresa (RUC 20)
  razon: string;
  cNombres: string;
  cPaterno: string;
  cMaterno: string;
  cCorreo: string;
  // Comunes a ambos casos
  tipo: TipoCliente;
  telefono: string;
  correo: string;
  password: string;
}

export interface Cliente extends ClienteFormModel {
  codigo: string;
  estado: EstadoCliente;
  usuario: string;
  verificado: boolean;
}

/** Nombre a mostrar: razón social si es empresa, "nombres apellidos" si es persona natural. */
export function nombreCliente(c: Pick<Cliente, 'persona' | 'razon' | 'nombres' | 'apellidos'>): string {
  return c.persona === 'empresa' ? c.razon : `${c.nombres} ${c.apellidos}`.trim();
}

/** RUC que empieza en "20" = empresa; cualquier otro caso (incluido RUC 10) = persona natural. */
export function personaPorDocumento(tipoDoc: TipoDocumento, doc: string): TipoPersona {
  return tipoDoc === 'RUC' ? (doc.indexOf('20') === 0 ? 'empresa' : 'natural') : 'natural';
}

export function generarClave(): string {
  return 'Fr2026-' + String(1000 + Math.floor(Math.random() * 8999));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** usuario = primera palabra de la razón social (empresa) o inicial+apellidos (natural) + "." + documento. */
export function generarUsuario(f: Pick<ClienteFormModel, 'persona' | 'razon' | 'nombres' | 'apellidos' | 'doc'>): string {
  const base =
    f.persona === 'empresa'
      ? slugify(f.razon || '').split('-')[0] || 'empresa'
      : slugify((f.nombres || '').charAt(0) + (f.apellidos || '')) || 'cliente';
  return `${base}.${(f.doc || '').toLowerCase()}`;
}

/** Limpia los campos del "otro" tipo de persona al cambiar de tipoDoc/doc, igual que hace el diseño. */
export function limpiarPersona(f: ClienteFormModel, persona: TipoPersona): ClienteFormModel {
  if (persona === f.persona) return { ...f, persona };
  return persona === 'empresa'
    ? { ...f, persona, nombres: '', apellidos: '', nacimiento: '', departamento: '', provincia: '', distrito: '', direccion: '' }
    : { ...f, persona, razon: '', cNombres: '', cPaterno: '', cMaterno: '', cCorreo: '' };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Mismas reglas y mismos mensajes que `validarCliente` en el diseño real. */
export function validarCliente(f: ClienteFormModel): string[] {
  const e: string[] = [];
  if (!f.doc) e.push('número de documento');
  else if (f.tipoDoc !== 'Pasaporte' && !/^[0-9]+$/.test(f.doc)) e.push('el documento admite solo dígitos');
  else if (f.doc.length !== LARGO_DOC[f.tipoDoc]) e.push(`el documento debe tener ${LARGO_DOC[f.tipoDoc]} caracteres`);
  else if (f.tipoDoc === 'RUC' && !['10', '20'].includes(f.doc.slice(0, 2))) e.push('el RUC debe iniciar en 10 o 20');

  if (f.persona === 'empresa' && !f.razon) e.push('razón social');
  if (f.persona !== 'empresa' && (!f.nombres || !f.apellidos)) e.push('nombres y apellidos');
  if (f.persona !== 'empresa') {
    if (!f.nacimiento) e.push('fecha de nacimiento');
    if (!f.departamento || !f.provincia || !f.distrito) e.push('departamento, provincia y distrito');
    if (!f.direccion) e.push('dirección');
  }
  if (f.persona === 'empresa') {
    if (!f.cNombres || !f.cPaterno || !f.cMaterno) e.push('nombres y apellidos del contacto');
    if (!f.cCorreo) e.push('correo del contacto');
    else if (!EMAIL_RE.test(f.cCorreo)) e.push('el correo del contacto no tiene un formato válido');
  }

  if (!f.telefono) e.push('teléfono');
  else if (!/^[0-9]{9}$/.test(f.telefono)) e.push('el teléfono debe tener 9 dígitos');
  if (!f.correo) e.push('correo');
  else if (!EMAIL_RE.test(f.correo)) e.push('el correo no tiene un formato válido');

  return e;
}

export function clienteFormVacio(): ClienteFormModel {
  return {
    tipoDoc: 'DNI', persona: 'natural', doc: '', razon: '',
    nombres: '', apellidos: '', nacimiento: '', departamento: '', provincia: '', distrito: '', direccion: '',
    cNombres: '', cPaterno: '', cMaterno: '', cCorreo: '',
    tipo: 'Minorista', telefono: '', correo: '', password: generarClave(),
  };
}