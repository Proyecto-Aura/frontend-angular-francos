import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Card } from '../../../../../shared/ds/card/card';
import { Select, SelectOption } from '../../../../../shared/ds/select/select';
import { Empresa } from '../../../empresa/interfaces/empresa.interface';
import { EmpresaService } from '../../../empresa/services/empresa.service';
import {
  SerieComprobante,
  comprobanteSiguiente,
  etiquetaDeTipo,
} from '../../interfaces/serie-comprobante.interface';

interface DatoVistaPrevia {
  etiqueta: string;
  valor: string;
}

interface LineaVistaPrevia {
  cantidad: number;
  descripcion: string;
  importe: string;
}

interface TotalVistaPrevia {
  etiqueta: string;
  valor: string;
  destacado: boolean;
}

/** Las líneas, el cliente y la fecha son de ejemplo: solo la cabecera sale de Datos de empresa. */
const LINEAS_EJEMPLO: { cantidad: number; descripcion: string; total: number }[] = [
  { cantidad: 2, descripcion: 'Torta de chocolate (molde 22 cm)', total: 170 },
  { cantidad: 12, descripcion: 'Alfajores de maicena (caja x 6)', total: 216 },
];
const IGV = 1.18;

const dinero = (valor: number) =>
  `S/ ${valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

@Component({
  imports: [Card, Select],
  selector: 'app-serie-vista-previa',
  templateUrl: './serie-vista-previa.html',
})
export class SerieVistaPrevia implements OnInit {
  private empresaService = inject(EmpresaService);
  private destroyRef = inject(DestroyRef);

  series = input<SerieComprobante[]>([]);

  protected readonly empresa = signal<Empresa | null>(null);
  private readonly elegida = signal('');

  private readonly fecha = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  /** Solo las series con las que se puede emitir: activas y con correlativos disponibles. */
  private readonly utilizables = computed(() =>
    this.series().filter((serie) => serie.activa && serie.restantes > 0),
  );

  protected readonly opciones = computed<SelectOption[]>(() =>
    this.utilizables().map((serie) => ({
      value: String(serie.id),
      label: `${serie.codigo} · ${etiquetaDeTipo(serie.tipo)}`,
    })),
  );

  /** La elegida; si no hay (o ya no sirve), la primera factura o, si no, la primera. */
  protected readonly serie = computed(() => {
    const utilizables = this.utilizables();
    return (
      utilizables.find((s) => String(s.id) === this.elegida()) ??
      utilizables.find((s) => s.tipo === 'factura') ??
      utilizables[0] ??
      null
    );
  });

  protected readonly serieElegida = computed(() => {
    const serie = this.serie();
    return serie ? String(serie.id) : '';
  });

  protected readonly subtitulo = computed(() =>
    this.serie() ? 'Próximo comprobante · datos de empresa' : 'Sin series activas',
  );

  protected readonly titulo = computed(() => {
    const serie = this.serie();
    return serie ? etiquetaDeTipo(serie.tipo).toUpperCase() : 'COMPROBANTE';
  });

  protected readonly numero = computed(() => {
    const serie = this.serie();
    return serie ? (comprobanteSiguiente(serie) ?? '—') : '—';
  });

  protected readonly contacto = computed(() => {
    const empresa = this.empresa();
    return [empresa?.telefono, empresa?.email].filter(Boolean).join(' · ');
  });

  private readonly esBoleta = computed(() => this.serie()?.tipo === 'boleta');

  protected readonly datos = computed<DatoVistaPrevia[]>(() => {
    const fecha = { etiqueta: 'Fecha de emisión', valor: this.fecha };
    return this.esBoleta()
      ? [
          fecha,
          { etiqueta: 'DNI', valor: '45871236' },
          { etiqueta: 'Cliente', valor: 'Carmen Salazar Ruiz' },
        ]
      : [
          fecha,
          { etiqueta: 'RUC', valor: '20601458732' },
          { etiqueta: 'Razón social', valor: 'Inversiones Gourmet del Sur S.A.C.' },
          { etiqueta: 'Condición de pago', valor: 'Contado' },
        ];
  });

  protected readonly etiquetaImporte = computed(() =>
    this.esBoleta() ? 'Importe' : 'Valor venta',
  );

  protected readonly lineas = computed<LineaVistaPrevia[]>(() =>
    LINEAS_EJEMPLO.map((linea) => ({
      cantidad: linea.cantidad,
      descripcion: linea.descripcion,
      importe: dinero(this.esBoleta() ? linea.total : linea.total / IGV),
    })),
  );

  protected readonly totales = computed<TotalVistaPrevia[]>(() => {
    const total = LINEAS_EJEMPLO.reduce((suma, linea) => suma + linea.total, 0);
    if (this.esBoleta()) {
      return [{ etiqueta: 'Total (IGV incluido)', valor: dinero(total), destacado: true }];
    }
    const base = total / IGV;
    return [
      { etiqueta: 'Op. gravada', valor: dinero(base), destacado: false },
      { etiqueta: 'IGV 18%', valor: dinero(total - base), destacado: false },
      { etiqueta: 'Importe total', valor: dinero(total), destacado: true },
    ];
  });

  ngOnInit(): void {
    this.empresaService
      .obtener()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (empresa) => this.empresa.set(empresa), error: () => undefined });
  }

  protected elegir(valor: string): void {
    this.elegida.set(valor);
  }
}
