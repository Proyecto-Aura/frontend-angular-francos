import type { BadgeTone } from '../../../../../shared/ds/badge/badge';
import {
  TableroAnio,
  TableroColorSemaforo,
  TableroKpiFila,
} from '../../interfaces/tablero-control.interface';

export interface ResumenSemaforo {
  total: number;
  verde: number;
  amarillo: number;
  rojo: number;
  sinDato: number;
}

export function ultimoValorDelKpi(fila: TableroKpiFila): TableroAnio | null {
  return fila.anios.reduce<TableroAnio | null>((ultimo, actual) => {
    if (actual.valor === null) return ultimo;
    return ultimo === null || actual.anio > ultimo.anio ? actual : ultimo;
  }, null);
}

export function etiquetaPeriodo(periodo: TableroAnio['periodo']): string {
  if (periodo === null) return '';
  if (periodo.codigo === 'A1') return 'Anual';
  if (/^[TBS]/.test(periodo.codigo)) return `al ${periodo.codigo}`;
  return `al ${periodo.nombre}`;
}

export function resumenSemaforo(filas: TableroKpiFila[]): ResumenSemaforo {
  return filas.reduce<ResumenSemaforo>(
    (resumen, fila) => {
      const color = ultimoValorDelKpi(fila)?.color;
      resumen.total += 1;
      if (color === 'VERDE') resumen.verde += 1;
      else if (color === 'AMARILLO') resumen.amarillo += 1;
      else if (color === 'ROJO') resumen.rojo += 1;
      else resumen.sinDato += 1;
      return resumen;
    },
    { total: 0, verde: 0, amarillo: 0, rojo: 0, sinDato: 0 },
  );
}

export function tonoSemaforo(color: TableroColorSemaforo): BadgeTone {
  if (color === 'VERDE') return 'success';
  if (color === 'AMARILLO') return 'warning';
  return 'danger';
}

export function nombreSemaforo(color: TableroColorSemaforo): 'Verde' | 'Amarillo' | 'Rojo' {
  if (color === 'VERDE') return 'Verde';
  if (color === 'AMARILLO') return 'Amarillo';
  return 'Rojo';
}

export function tonoPerspectiva(orden: number): BadgeTone {
  if (orden === 1) return 'success';
  if (orden === 2) return 'info';
  if (orden === 3) return 'warning';
  return 'neutral';
}
