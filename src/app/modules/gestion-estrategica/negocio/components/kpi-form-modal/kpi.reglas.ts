import { MetaAnual, MetaAnualForm, OperadorMeta, Periodo } from '../../interfaces/kpi.interface';

export interface ErroresFilasMetas {
  porAnio: Record<number, string[]>;
  general: string | null;
}

export interface OpcionPeriodoAnio {
  anio: number;
  periodoId: number;
  etiqueta: string;
}

export function validarFilasMetas(filas: MetaAnualForm[]): ErroresFilasMetas {
  const porAnio: Record<number, string[]> = {};
  const operadores = new Set(filas.map((fila) => fila.operador));

  for (const fila of filas) {
    const errores: string[] = [];
    const meta = numeroValido(fila.meta);
    const amarillo = numeroValido(fila.valorAmarillo);

    if (meta === null) errores.push('La meta es obligatoria y debe ser numérica.');
    if (amarillo === null) {
      errores.push('El valor amarillo es obligatorio y debe ser numérico.');
    }

    if (meta !== null && amarillo !== null) {
      const masExigente =
        (fila.operador === '>=' && amarillo > meta) || (fila.operador === '<=' && amarillo < meta);
      if (masExigente) {
        errores.push('El Amarillo no puede ser más exigente que el Verde.');
      }
    }

    if (errores.length > 0) porAnio[fila.anio] = errores;
  }

  return {
    porAnio,
    general: operadores.size > 1 ? 'El operador debe ser el mismo en todos los años.' : null,
  };
}

export function calcularSemaforo(
  valor: number,
  metaDelAnio: MetaAnual,
): 'VERDE' | 'AMARILLO' | 'ROJO' {
  if (cumple(valor, metaDelAnio.operador, metaDelAnio.meta)) return 'VERDE';
  if (cumple(valor, metaDelAnio.operadorAmarillo, metaDelAnio.valorAmarillo)) {
    return 'AMARILLO';
  }
  return 'ROJO';
}

export function calcularCumplimiento(valor: number, meta: number): number | null {
  return meta === 0 ? null : (valor / meta) * 100;
}

export function formatearValor(valor: number, simbolo: string): string {
  const numero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(valor);
  const unidad = simbolo.trim();
  if (unidad === 'S/') return `${unidad} ${numero}`;
  return unidad ? `${numero} ${unidad}` : numero;
}

export function textoOperador(operador: OperadorMeta): '≥' | '≤' {
  return operador === '>=' ? '≥' : '≤';
}

export function opcionesPeriodoAnio(
  aniosDelPlan: number[],
  periodos: Periodo[],
): OpcionPeriodoAnio[] {
  const periodosOrdenados = [...periodos].sort((a, b) => a.numero - b.numero);
  return aniosDelPlan.flatMap((anio) =>
    periodosOrdenados.map((periodo) => ({
      anio,
      periodoId: periodo.id,
      etiqueta: `${periodo.nombre} ${anio}`,
    })),
  );
}

function numeroValido(valor: string): number | null {
  if (!valor.trim()) return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function cumple(valor: number, operador: string, referencia: number): boolean {
  if (operador === '>=') return valor >= referencia;
  if (operador === '>') return valor > referencia;
  if (operador === '<=') return valor <= referencia;
  if (operador === '<') return valor < referencia;
  return valor === referencia;
}
