import { formatearValor } from '../../components/kpi-form-modal/kpi.reglas';
import {
  Cumplimiento,
  SeguimientoKpi,
  SeguimientoPunto,
} from '../../interfaces/seguimiento-kpis.interface';

export function claseCumplimiento(porcentaje: number | null): string {
  if (porcentaje === null) return 'bg-muted-foreground';
  if (porcentaje >= 95) return 'bg-success';
  if (porcentaje >= 80) return 'bg-warning';
  return 'bg-destructive';
}

export function textoPorcentaje(valor: number | null): string {
  return valor === null ? '—' : `${Math.round(valor)}%`;
}

export function conteosCumplimiento(cumplimiento: Cumplimiento) {
  return [
    { etiqueta: 'verde', clase: 'bg-success', n: cumplimiento.verde },
    { etiqueta: 'amarillo', clase: 'bg-warning', n: cumplimiento.amarillo },
    { etiqueta: 'rojo', clase: 'bg-destructive', n: cumplimiento.rojo },
    { etiqueta: 'sin dato', clase: 'bg-muted-foreground', n: cumplimiento.sinDato },
  ];
}

export function etiquetaPeriodoCompleta(punto: {
  anio: number;
  periodoCodigo: string;
  periodoNombre: string;
}): string {
  if (punto.periodoCodigo === 'A1') return `Año ${punto.anio}`;
  if (/^[TBS]/.test(punto.periodoCodigo)) return `${punto.periodoCodigo} ${punto.anio}`;
  return `${punto.periodoNombre} ${punto.anio}`;
}

export function etiquetaEjeX(
  punto: SeguimientoPunto,
  esPrimeroDelAnio: boolean,
  mostrarPeriodos: boolean,
  esAnual: boolean,
): string[] {
  if (esAnual) return [String(punto.anio)];
  if (!mostrarPeriodos) return esPrimeroDelAnio ? [String(punto.anio)] : [''];
  const periodo = punto.periodoCodigo.startsWith('M')
    ? punto.periodoNombre.slice(0, 3)
    : punto.periodoCodigo;
  return esPrimeroDelAnio ? [periodo, String(punto.anio)] : [periodo];
}

export function formatearEjeY(numero: number, simbolo: string): string {
  const absoluto = Math.abs(numero);
  const compacto =
    absoluto >= 1_000_000
      ? `${formatearNumero(numero / 1_000_000)}M`
      : absoluto >= 1_000
        ? `${formatearNumero(numero / 1_000)}k`
        : formatearNumero(numero);
  const unidad = simbolo.trim();
  if (unidad === 'S/') return `S/ ${compacto}`;
  if (unidad === '%') return `${compacto}%`;
  return compacto;
}

export function descripcionUltimoValor(kpi: SeguimientoKpi): {
  etiqueta: string;
  valor: string;
} {
  if (!kpi.ultimoValor) return { etiqueta: 'Último valor', valor: '—' };
  return {
    etiqueta: `Último · ${etiquetaPeriodoCompleta(kpi.ultimoValor)}`,
    valor: formatearValor(kpi.ultimoValor.valor, kpi.unidadSimbolo),
  };
}

export function descripcionMeta(kpi: SeguimientoKpi): { etiqueta: string; valor: string } {
  return {
    etiqueta: kpi.ultimoValor ? `Meta ${kpi.ultimoValor.anio}` : 'Meta',
    valor:
      kpi.metaUltimoAnio === null ? '—' : formatearValor(kpi.metaUltimoAnio, kpi.unidadSimbolo),
  };
}

function formatearNumero(numero: number): string {
  return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(numero);
}
