export const EXTENSIONES_PERMITIDAS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
];
export const TAMANO_MAXIMO = 10 * 1024 * 1024;
export const ACCEPT = EXTENSIONES_PERMITIDAS.map((extensionArchivo) => `.${extensionArchivo}`).join(
  ',',
);

export function extension(nombre: string): string {
  const indice = nombre.lastIndexOf('.');
  return indice > 0 && indice < nombre.length - 1 ? nombre.slice(indice + 1).toLowerCase() : '';
}

export function nombreSinExtension(nombre: string): string {
  const indice = nombre.lastIndexOf('.');
  return indice > 0 ? nombre.slice(0, indice) : nombre;
}

export function validarArchivo(archivo: File): string | null {
  if (!EXTENSIONES_PERMITIDAS.includes(extension(archivo.name))) {
    return 'Formato no permitido.';
  }
  if (archivo.size > TAMANO_MAXIMO) {
    return 'El archivo supera los 10 MB.';
  }
  return null;
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function tieneVistaPrevia(extensionArchivo: string): boolean {
  return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extensionArchivo.toLowerCase());
}
