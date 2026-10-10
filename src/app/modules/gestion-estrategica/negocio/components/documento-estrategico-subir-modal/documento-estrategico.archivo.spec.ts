import {
  ACCEPT,
  EXTENSIONES_PERMITIDAS,
  TAMANO_MAXIMO,
  extension,
  formatearTamano,
  nombreSinExtension,
  tieneVistaPrevia,
  validarArchivo,
} from './documento-estrategico.archivo';

function makeFile(nombre: string, size = 1): File {
  const file = new File(['x'], nombre);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('documento-estrategico.archivo', () => {
  it.each([
    ['informe.PDF', 'pdf'],
    ['a.b.docx', 'docx'],
    ['archivo', ''],
    ['.oculto', ''],
    ['archivo.', ''],
  ])('gets the extension from %s', (nombre, esperado) => {
    expect(extension(nombre)).toBe(esperado);
  });

  it('removes only the last extension from a name', () => {
    expect(nombreSinExtension('Analisis PESTEL.pdf')).toBe('Analisis PESTEL');
    expect(nombreSinExtension('archivo')).toBe('archivo');
  });

  it('accepts every supported extension', () => {
    for (const extensionPermitida of EXTENSIONES_PERMITIDAS) {
      expect(validarArchivo(makeFile(`archivo.${extensionPermitida}`))).toBeNull();
    }
  });

  it.each(['pptx', 'txt', ''])('rejects unsupported extension %s', (extensionArchivo) => {
    const nombre = extensionArchivo ? `archivo.${extensionArchivo}` : 'archivo';
    expect(validarArchivo(makeFile(nombre))).toBe('Formato no permitido.');
  });

  it('accepts exactly 10 MB and rejects one additional byte', () => {
    expect(validarArchivo(makeFile('archivo.pdf', TAMANO_MAXIMO))).toBeNull();
    expect(validarArchivo(makeFile('archivo.pdf', TAMANO_MAXIMO + 1))).toBe(
      'El archivo supera los 10 MB.',
    );
  });

  it('formats sizes in KB and MB', () => {
    expect(formatearTamano(2048)).toBe('2 KB');
    expect(formatearTamano(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('identifies previewable file types case-insensitively', () => {
    for (const tipo of ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'PDF', 'PNG']) {
      expect(tieneVistaPrevia(tipo)).toBe(true);
    }
    for (const tipo of ['doc', 'docx', 'xls', 'xlsx']) {
      expect(tieneVistaPrevia(tipo)).toBe(false);
    }
  });

  it('builds an accept list without PowerPoint', () => {
    expect(ACCEPT).toContain('.pdf');
    expect(ACCEPT).not.toContain('.pptx');
  });
});
