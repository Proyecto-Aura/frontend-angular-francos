import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CategoriaDto,
  PageDto,
  PresentacionDto,
  ProductoCreadoDto,
  ProductoPresentacionFilaDto,
} from '../interfaces/producto-dto.interface';
import {
  OpcionCatalogo,
  PresentacionForm,
  Producto,
  ProductoFormModel,
  ResultadoGuardado,
  aFilas,
} from '../interfaces/producto.interface';
import {
  toActualizarProductoPresentacionRequest,
  toActualizarProductoRequest,
  toActualizarPromocionRequest,
  toCrearProductoPresentacionRequest,
  toCrearProductoRequest,
  toCrearPromocionRequest,
  toOpcionCategoria,
  toOpcionPresentacion,
  toProductos,
} from '../mappers/producto.mapper';
import { mensajeDeError } from '../utils/error-api';

const PRODUCTOS = `${environment.apiUrl}/productos`;
const PRODUCTO_PRESENTACIONES = `${environment.apiUrl}/producto-presentaciones`;
const PROMOCIONES = `${environment.apiUrl}/promociones`;
const CATEGORIAS = `${environment.apiUrl}/categorias`;
const PRESENTACIONES = `${environment.apiUrl}/presentaciones`;

// Máximo que acepta la API por página.
const LIMITE = 100;

/** Un paso de un guardado: si falla, los siguientes no se ejecutan. */
interface Paso {
  descripcion: string;
  run: () => Observable<unknown>;
}

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private http = inject(HttpClient);

  productos = signal<Producto[]>([]);
  categoriaOpciones = signal<OpcionCatalogo[]>([]);
  presentacionOpciones = signal<OpcionCatalogo[]>([]);
  cargando = signal(false);
  errorCarga = signal(false);

  filas = computed(() => aFilas(this.productos()));
  /** Nombres de categoría para el filtro del listado. */
  categorias = computed(() => this.categoriaOpciones().map((c) => c.nombre));

  // ───────────── Lectura ─────────────

  /** Carga el catálogo completo (el listado filtra y pagina en pantalla). */
  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);

    this.obtener()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        error: () => {
          this.productos.set([]);
          this.errorCarga.set(true);
        },
      });
  }

  private obtener(): Observable<void> {
    return forkJoin({
      filas: this.listarTodos<ProductoPresentacionFilaDto>(PRODUCTO_PRESENTACIONES),
      categorias: this.listarTodos<CategoriaDto>(CATEGORIAS),
      presentaciones: this.listarTodos<PresentacionDto>(PRESENTACIONES),
    }).pipe(
      tap(({ filas, categorias, presentaciones }) => {
        this.productos.set(toProductos(filas));
        this.categoriaOpciones.set(categorias.map(toOpcionCategoria));
        this.presentacionOpciones.set(presentaciones.map(toOpcionPresentacion));
      }),
      map(() => undefined),
    );
  }

  listarTodos<T>(url: string): Observable<T[]> {
    const pagina = (page: number) =>
      this.http.get<PageDto<T>>(url, { params: { page, limit: LIMITE } });

    return pagina(1).pipe(
      switchMap((primera) => {
        const restantes = Array.from(
          { length: Math.max(0, primera.meta.total_pages - 1) },
          (_, i) => pagina(i + 2),
        );

        if (restantes.length === 0) return of(primera.data);

        return forkJoin(restantes).pipe(
          map((paginas) => [primera.data, ...paginas.map((p) => p.data)].flat()),
        );
      }),
    );
  }

  // ───────────── Escritura ─────────────

  /**
   * Registra el producto con sus presentaciones y luego sus promociones. Solo
   * falla (error) si el producto no se pudo crear; si falla una promoción, el
   * producto ya existe y se informa en el aviso.
   */
  registrar(pf: ProductoFormModel): Observable<ResultadoGuardado> {
    return this.http.post<ProductoCreadoDto>(PRODUCTOS, toCrearProductoRequest(pf)).pipe(
      switchMap((creado) => {
        const creadaDe = (p: PresentacionForm) =>
          creado.producto_presentaciones.find(
            (pp) => pp.presentacion_id === Number(p.presentacionId),
          );
        const noEncontrada = () => throwError(() => new Error('presentación no encontrada'));

        const imagenes: Paso[] = pf.presentaciones
          .filter((p) => p.imagenArchivo)
          .map((p) => ({
            descripcion: `la imagen de la presentación ${this.etiquetaDe(p)}`,
            run: () => {
              const creada = creadaDe(p);
              return creada ? this.subirImagen(creada.id, p.imagenArchivo as File) : noEncontrada();
            },
          }));
        const promociones: Paso[] = pf.presentaciones
          .filter((p) => p.promoActiva)
          .map((p) => ({
            descripcion: `la promoción de la presentación ${this.etiquetaDe(p)}`,
            run: () => {
              const creada = creadaDe(p);
              return creada
                ? this.http.post(PROMOCIONES, toCrearPromocionRequest(creada.id, p))
                : noEncontrada();
            },
          }));
        const pasos = [...imagenes, ...promociones];

        return this.ejecutar(pasos).pipe(
          switchMap((fallo) => this.obtener().pipe(map(() => this.avisoRegistro(creado, fallo)))),
        );
      }),
    );
  }

  /**
   * Actualiza el producto y luego cada presentación (con su promoción). Solo falla
   * (error) si no se pudo guardar el producto; si falla una presentación, lo
   * anterior ya quedó guardado y se informa en el aviso.
   */
  actualizar(id: number, pf: ProductoFormModel): Observable<ResultadoGuardado> {
    return this.http.patch(`${PRODUCTOS}/${id}`, toActualizarProductoRequest(pf)).pipe(
      switchMap(() =>
        this.ejecutar(
          pf.presentaciones.map((p) => ({
            descripcion: `la presentación ${this.etiquetaDe(p)}`,
            run: () => this.guardarPresentacion(id, p),
          })),
        ),
      ),
      switchMap((fallo) =>
        this.obtener().pipe(
          map((): ResultadoGuardado =>
            fallo
              ? {
                  tono: 'error',
                  mensaje: `Se guardaron los datos del producto, pero no se pudo guardar ${fallo}`,
                }
              : {
                  tono: 'ok',
                  mensaje: 'Producto actualizado · el SKU y el slug se mantienen sin cambios.',
                },
          ),
        ),
      ),
    );
  }

  /** "Desactivar" es lógico: alterna Activo/Inactivo de la presentación, sin borrarla. */
  alternarEstadoPresentacion(productoId: number, presentacionId: number): Observable<string> {
    const fila = this.filas().find(
      (f) => f.productoId === productoId && f.presentacionId === presentacionId,
    );

    if (!fila) {
      return throwError(() => new Error('Presentación no encontrada'));
    }

    const activar = fila.estado !== 'Activo';
    const url = `${PRODUCTO_PRESENTACIONES}/${fila.productoPresentacionId}`;
    const peticion = activar ? this.http.patch(`${url}/activate`, null) : this.http.delete(url);

    return peticion.pipe(
      switchMap(() => this.obtener()),
      map(() =>
        activar
          ? `Presentación ${fila.sku} reactivada.`
          : `Presentación ${fila.sku} desactivada de forma lógica.`,
      ),
    );
  }

  // ───────────── Apoyo ─────────────

  /** Sube el archivo como imagen de la presentación (la API guarda solo la key y devuelve la URL). */
  private subirImagen(productoPresentacionId: number, archivo: File): Observable<unknown> {
    const datos = new FormData();
    datos.append('imagen', archivo);
    return this.http.post(`${PRODUCTO_PRESENTACIONES}/${productoPresentacionId}/imagen`, datos);
  }

  private guardarPresentacion(productoId: number, p: PresentacionForm): Observable<unknown> {
    const productoPresentacionId$: Observable<number> =
      p.productoPresentacionId === null
        ? this.http
            .post<{ id: number }>(
              PRODUCTO_PRESENTACIONES,
              toCrearProductoPresentacionRequest(productoId, p),
            )
            .pipe(map((creada) => creada.id))
        : this.http
            .patch(
              `${PRODUCTO_PRESENTACIONES}/${p.productoPresentacionId}`,
              toActualizarProductoPresentacionRequest(p),
            )
            .pipe(map(() => p.productoPresentacionId as number));

    return productoPresentacionId$.pipe(
      switchMap((productoPresentacionId) =>
        (p.imagenArchivo
          ? this.subirImagen(productoPresentacionId, p.imagenArchivo)
          : of(null)
        ).pipe(switchMap(() => this.guardarPromocion(productoPresentacionId, p))),
      ),
    );
  }

  /** Crea, edita o desactiva la promoción de la presentación según lo que muestre el formulario. */
  private guardarPromocion(
    productoPresentacionId: number,
    p: PresentacionForm,
  ): Observable<unknown> {
    if (p.promoActiva) {
      return p.promoId === null
        ? this.http.post(PROMOCIONES, toCrearPromocionRequest(productoPresentacionId, p))
        : this.http.patch(`${PROMOCIONES}/${p.promoId}`, toActualizarPromocionRequest(p));
    }

    return p.promoId === null ? of(null) : this.http.delete(`${PROMOCIONES}/${p.promoId}`);
  }

  /** Ejecuta los pasos en orden. Devuelve el mensaje del primero que falle, o null si todos salieron bien. */
  private ejecutar(pasos: Paso[]): Observable<string | null> {
    return pasos.reduce<Observable<string | null>>(
      (anterior, paso) =>
        anterior.pipe(
          switchMap((fallo) =>
            fallo
              ? of(fallo)
              : paso.run().pipe(
                  map((): string | null => null),
                  catchError((error: unknown) =>
                    of(`${paso.descripcion}: ${mensajeDeError(error, 'error inesperado')}`),
                  ),
                ),
          ),
        ),
      of(null),
    );
  }

  private etiquetaDe(p: PresentacionForm): string {
    const opcion = this.presentacionOpciones().find((o) => String(o.id) === p.presentacionId);
    return opcion ? opcion.nombre : (p.sku ?? '');
  }

  private avisoRegistro(creado: ProductoCreadoDto, fallo: string | null): ResultadoGuardado {
    const skus = creado.producto_presentaciones.map((pp) => pp.sku).join(', ');

    return fallo
      ? {
          tono: 'error',
          mensaje: `Producto registrado (SKU ${skus}), pero no se pudo guardar ${fallo}. Edita el producto para volver a intentarlo.`,
        }
      : {
          tono: 'ok',
          mensaje: `Producto registrado · SKU ${skus} · producto terminado creado por presentación (stock actual 0, stock mínimo 1) · visible en Portal B inicia desactivado.`,
        };
  }
}
