import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, finalize, forkJoin, map, of } from 'rxjs';

import { Alert, AlertTone } from '../../../../../shared/ds/alert/alert';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/ds/breadcrumb/breadcrumb';
import { Button } from '../../../../../shared/ds/button/button';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import { MetodosPagoCard } from '../../components/metodos-pago-card/metodos-pago-card';
import { PromocionesCard } from '../../components/promociones-card/promociones-card';
import { UmbralMayoristaCard } from '../../components/umbral-mayorista-card/umbral-mayorista-card';
import {
  EdicionUmbral,
  ErroresParametros,
  ParametrosVentas,
  cambiosDeParametros,
  esCambioDeUmbral,
  umbralDeTexto,
  validarParametros,
  validarUmbralPropio,
} from '../../interfaces/parametros-ventas.interface';
import { ParametrosVentasService } from '../../services/parametros-ventas.service';

/** Resultado de cada petición de guardado: una que falla no cancela las demás. */
type Resultado = { ok: true; id?: number } | { ok: false; id?: number; mensaje: string };
type ResultadoFallido = Extract<Resultado, { ok: false }>;

/**
 * HU-A-045: parámetros de ventas, solo para el admin. Umbral mayorista global o por producto
 * (RF-A193), promociones (RF-A194) y métodos de pago del portal (RF-A195). Todo se guarda junto
 * con «Guardar cambios».
 */
@Component({
  imports: [
    Alert,
    Badge,
    Breadcrumb,
    Button,
    MetodosPagoCard,
    PromocionesCard,
    UmbralMayoristaCard,
  ],
  selector: 'app-gestionar-parametros-ventas',
  templateUrl: './parametros-ventas.html',
})
export class GestionarParametrosVentas implements OnInit {
  private service = inject(ParametrosVentasService);
  private destroyRef = inject(DestroyRef);
  constructor() {
    this.destroyRef.onDestroy(() => this.cerrarToast());
  }

  toast = signal<{ tone: AlertTone; title: string; description?: string } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  cerrarToast(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = null;
    this.toast.set(null);
  }
  private mostrarToast(tone: AlertTone, title: string, description?: string): void {
    this.cerrarToast();
    this.toast.set({ tone, title, description });
    this.toastTimer = setTimeout(() => this.cerrarToast(), 4500);
  }

  protected readonly migas: BreadcrumbItem[] = [
    { label: 'Configuración' },
    { label: 'Parámetros de ventas' },
  ];

  // --- Carga ---
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly guardando = signal(false);
  protected readonly aviso = signal<{ mensaje: string; tono: 'ok' | 'error' }>({
    mensaje: '',
    tono: 'ok',
  });
  protected readonly guardadoA = signal('');

  // --- Estado: lo guardado en el servidor y lo que se está editando ---
  protected readonly guardado = signal<ParametrosVentas | null>(null);
  protected readonly editado = signal<ParametrosVentas | null>(null);
  protected readonly umbralTexto = signal('');
  protected readonly ediciones = signal<ReadonlyMap<number, EdicionUmbral>>(new Map());
  protected readonly recarga = signal(0);
  protected readonly intentoGuardar = signal(false);

  /** Umbrales propios cuyo valor cambió de verdad respecto del guardado. */
  protected readonly pendientes = computed(() =>
    [...this.ediciones().values()].filter(esCambioDeUmbral),
  );

  /** Parámetros con el umbral escrito (si es un número válido) para comparar con lo guardado. */
  private readonly parametrosEditados = computed<ParametrosVentas | null>(() => {
    const editado = this.editado();
    const guardado = this.guardado();
    if (!editado || !guardado) return null;
    const umbral = umbralDeTexto(this.umbralTexto());
    return { ...editado, umbralGlobal: umbral ?? guardado.umbralGlobal };
  });

  protected readonly hayCambios = computed(() => {
    const guardado = this.guardado();
    const editado = this.parametrosEditados();
    if (!guardado || !editado) return false;
    return (
      umbralDeTexto(this.umbralTexto()) !== guardado.umbralGlobal ||
      Object.keys(cambiosDeParametros(guardado, editado)).length > 0 ||
      this.pendientes().length > 0
    );
  });

  protected readonly errores = computed<ErroresParametros>(() => {
    const editado = this.editado();
    if (!editado || !this.intentoGuardar()) return {};
    return validarParametros(editado, this.umbralTexto());
  });

  protected readonly umbralesInvalidos = computed(
    () => this.pendientes().filter((e) => validarUmbralPropio(e.valor) !== null).length,
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.service
      .obtener()
      .pipe(
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (parametros) => this.aplicarGuardado(parametros),
        error: (error: unknown) =>
          this.errorCarga.set(apiErrorMessage(error, 'No se pudieron cargar los parámetros.')),
      });
  }

  private aplicarGuardado(parametros: ParametrosVentas): void {
    this.guardado.set(parametros);
    this.editado.set(parametros);
    this.umbralTexto.set(String(parametros.umbralGlobal));
  }

  // --- Cambios en pantalla ---
  protected cambiar(cambios: Partial<ParametrosVentas>): void {
    this.editado.update((actual) => (actual ? { ...actual, ...cambios } : actual));
    this.guardadoA.set('');
  }

  protected cambiarUmbral(texto: string): void {
    this.umbralTexto.set(texto);
    this.guardadoA.set('');
  }

  protected editarUmbralPropio(edicion: EdicionUmbral): void {
    this.ediciones.update((actual) => {
      const copia = new Map(actual);
      copia.set(edicion.id, edicion);
      return copia;
    });
    this.guardadoA.set('');
  }

  protected descartar(): void {
    const guardado = this.guardado();
    if (!guardado) return;
    this.aplicarGuardado(guardado);
    this.ediciones.set(new Map());
    this.intentoGuardar.set(false);
    this.cerrarAviso();
  }

  // --- Guardar ---
  protected guardar(): void {
    const guardado = this.guardado();
    const editado = this.parametrosEditados();
    if (!guardado || !editado || this.guardando()) return;

    this.intentoGuardar.set(true);
    if (Object.keys(this.errores()).length > 0) {
      this.mostrarToast(
        'warning',
        'Faltan campos por completar',
        'Revisa los campos marcados antes de guardar.',
      );
      return;
    }
    if (this.umbralesInvalidos() > 0) {
      this.mostrarAviso('Corrige los umbrales propios marcados antes de guardar.', 'error');
      return;
    }

    const peticiones: Observable<Resultado>[] = [];
    const cambios = cambiosDeParametros(guardado, editado);
    if (Object.keys(cambios).length > 0) {
      peticiones.push(
        this.service.actualizar(cambios).pipe(
          map((): Resultado => ({ ok: true })),
          catchError((error: unknown) =>
            of<Resultado>({
              ok: false,
              mensaje: apiErrorMessage(error, 'No se pudieron guardar los parámetros.'),
            }),
          ),
        ),
      );
    }
    for (const edicion of this.pendientes()) {
      peticiones.push(
        this.service.actualizarUmbralPresentacion(edicion.id, umbralDeTexto(edicion.valor)).pipe(
          map((): Resultado => ({ ok: true, id: edicion.id })),
          catchError((error: unknown) =>
            of<Resultado>({
              ok: false,
              id: edicion.id,
              mensaje: apiErrorMessage(error, 'No se pudo guardar un umbral propio.'),
            }),
          ),
        ),
      );
    }
    if (peticiones.length === 0) return;

    this.guardando.set(true);
    forkJoin(peticiones)
      .pipe(
        finalize(() => this.guardando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultados) => this.alTerminarGuardado(resultados));
  }

  private alTerminarGuardado(resultados: Resultado[]): void {
    const fallos = resultados.filter((r): r is ResultadoFallido => !r.ok);
    const guardadosIds = new Set(
      resultados.flatMap((r) => (r.ok && r.id !== undefined ? [r.id] : [])),
    );

    // Lo que se guardó deja de estar «pendiente»; lo que falló se conserva para reintentar.
    this.ediciones.update((actual) => {
      const copia = new Map(actual);
      guardadosIds.forEach((id) => copia.delete(id));
      return copia;
    });
    this.recarga.update((n) => n + 1);
    this.intentoGuardar.set(false);

    // Siempre se vuelve a leer del servidor: así la pantalla refleja lo que quedó guardado.
    this.service.obtener().subscribe({
      next: (parametros) => {
        this.guardado.set(parametros);
        // Con fallos, lo editado se conserva tal cual para poder reintentar.
        if (fallos.length === 0) this.aplicarGuardado(parametros);
      },
    });

    if (fallos.length === 0) {
      this.guardadoA.set(new Date().toTimeString().slice(0, 5));
      this.mostrarAviso('Parámetros de ventas guardados');
    } else {
      const { mensaje } = fallos[0];
      this.mostrarAviso(
        fallos.length === 1
          ? mensaje
          : `No se pudieron guardar ${fallos.length} cambios. ${mensaje}`,
        'error',
      );
    }
  }

  protected mostrarAviso(
    mensaje: string,
    tono: 'ok' | 'error' = 'ok',
    titulo = mensaje,
    descripcion?: string,
  ): void {
    this.aviso.set({ mensaje, tono });
    this.mostrarToast(tono === 'ok' ? 'success' : 'error', titulo, descripcion);
  }

  protected cerrarAviso(): void {
    this.cerrarToast();
    this.aviso.set({ mensaje: '', tono: 'ok' });
  }
}
