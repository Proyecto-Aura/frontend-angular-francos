import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CategoriaDto, PresentacionDto } from '../interfaces/producto-dto.interface';
import { CfgFormModel, CfgTab, RegistroCfg, UnidadCfg } from '../interfaces/producto.interface';
import {
  etiquetaPresentacion,
  toOpcionCategoria,
  toOpcionPresentacion,
} from '../mappers/producto.mapper';
import { CatalogoService } from './catalogo.service';

const CATEGORIAS = `${environment.apiUrl}/categorias`;
const PRESENTACIONES = `${environment.apiUrl}/presentaciones`;

// La API identifica una presentación por cantidad + unidad de medida: su "nombre" es la etiqueta (500 gr).
const MAXIMO_CANTIDAD = 1_000_000;

const toRegistroCategoria = (dto: CategoriaDto): RegistroCfg => ({
  id: dto.id,
  nombre: dto.nombre,
  descripcion: dto.descripcion ?? '',
  estado: dto.estado ? 'Activo' : 'Inactivo',
});

// Configuración del catálogo (categorías y presentaciones), ambas con la API real.

const toRegistroPresentacion = (dto: PresentacionDto): RegistroCfg => ({
  id: dto.id,
  nombre: etiquetaPresentacion(dto.cantidad, dto.unidad_medida),
  descripcion: dto.descripcion ?? '',
  estado: dto.estado ? 'Activo' : 'Inactivo',
  cantidad: dto.cantidad,
  unidad: dto.unidad_medida,
});

const ETIQUETA: Record<CfgTab, string> = {
  categorias: 'Categoría',
  presentaciones: 'Presentación',
};

@Injectable({ providedIn: 'root' })
export class ConfiguracionCatalogoService {
  private http = inject(HttpClient);
  private catalogo = inject(CatalogoService);

  categoriasCfg = signal<RegistroCfg[]>([]);
  cargandoCategorias = signal(false);
  errorCategorias = signal(false);
  presentacionesCfg = signal<RegistroCfg[]>([]);
  cargandoPresentaciones = signal(false);
  errorPresentaciones = signal(false);

  lista(tab: CfgTab): RegistroCfg[] {
    return tab === 'categorias' ? this.categoriasCfg() : this.presentacionesCfg();
  }

  /** Cantidad de presentaciones que usan el registro (columna "Productos asociados"). */
  usosDe(tab: CfgTab, reg: RegistroCfg): number {
    const prods = this.catalogo.productos();
    if (tab === 'categorias') {
      return prods
        .filter((p) => p.categoria === reg.nombre)
        .reduce((a, p) => a + p.presentaciones.length, 0);
    }
    return prods.reduce(
      (a, p) => a + p.presentaciones.filter((pr) => pr.nombre === reg.nombre).length,
      0,
    );
  }

  validarCfg(tab: CfgTab, selId: number | null, cf: CfgFormModel): string[] {
    const e: string[] = [];
    if (tab === 'presentaciones') return this.validarPresentacion(selId, cf);
    if (!cf.nombre) e.push('nombre');
    if (!cf.descripcion) e.push('descripción');
    const dup = this.lista(tab).some(
      (x) => x.nombre.toLowerCase() === cf.nombre.toLowerCase() && x.id !== selId,
    );
    if (dup) e.push('el nombre ya está registrado');
    return e;
  }

  private validarPresentacion(selId: number | null, cf: CfgFormModel): string[] {
    const e: string[] = [];
    const cantidad = (cf.cantidad ?? '').trim();
    const cantidadValida =
      /^\d+$/.test(cantidad) && Number(cantidad) >= 1 && Number(cantidad) <= MAXIMO_CANTIDAD;
    if (!cantidadValida) e.push('cantidad (entero entre 1 y 1.000.000)');
    if (cf.unidad !== 'kg' && cf.unidad !== 'gr') e.push('unidad de medida');
    if (!cf.descripcion.trim()) e.push('descripción');
    const dup = this.presentacionesCfg().some(
      (x) => x.cantidad === Number(cantidad) && x.unidad === cf.unidad && x.id !== selId,
    );
    if (cantidadValida && dup) e.push('la presentación ya está registrada');
    return e;
  }

  /** Carga todas las categorías (activas e inactivas) desde la API. */
  cargarCategorias(): void {
    this.cargandoCategorias.set(true);
    this.errorCategorias.set(false);

    this.catalogo
      .listarTodos<CategoriaDto>(CATEGORIAS)
      .pipe(finalize(() => this.cargandoCategorias.set(false)))
      .subscribe({
        next: (categorias) => this.aplicarCategorias(categorias),
        error: () => {
          this.categoriasCfg.set([]);
          this.errorCategorias.set(true);
        },
      });
  }

  /** Carga todas las presentaciones (activas e inactivas) desde la API. */
  cargarPresentaciones(): void {
    this.cargandoPresentaciones.set(true);
    this.errorPresentaciones.set(false);

    this.catalogo
      .listarTodos<PresentacionDto>(PRESENTACIONES)
      .pipe(finalize(() => this.cargandoPresentaciones.set(false)))
      .subscribe({
        next: (presentaciones) => this.aplicarPresentaciones(presentaciones),
        error: () => {
          this.presentacionesCfg.set([]);
          this.errorPresentaciones.set(true);
        },
      });
  }

  private aplicarPresentaciones(presentaciones: PresentacionDto[]): void {
    this.presentacionesCfg.set(presentaciones.map(toRegistroPresentacion));
    this.catalogo.presentacionOpciones.set(presentaciones.map(toOpcionPresentacion));
  }

  private aplicarCategorias(categorias: CategoriaDto[]): void {
    this.categoriasCfg.set(categorias.map(toRegistroCategoria));
    this.catalogo.categoriaOpciones.set(categorias.map(toOpcionCategoria));
  }

  /** Alta (selId = null) o edición. Emite el aviso; en categorías, error si la API rechaza. */
  guardarCfg(tab: CfgTab, selId: number | null, cf: CfgFormModel): Observable<string> {
    const etiqueta = ETIQUETA[tab];
    const nombre =
      tab === 'presentaciones'
        ? etiquetaPresentacion(Number(cf.cantidad), cf.unidad as UnidadCfg)
        : cf.nombre.trim();
    const aviso =
      selId === null
        ? `${etiqueta} ${nombre} registrada · disponible en los selectores de producto.`
        : `${etiqueta} ${nombre} actualizada.`;

    if (tab === 'categorias') {
      const cuerpo = { nombre: cf.nombre.trim(), descripcion: cf.descripcion.trim() };
      const peticion =
        selId === null
          ? this.http.post<CategoriaDto>(CATEGORIAS, cuerpo)
          : this.http.patch<CategoriaDto>(`${CATEGORIAS}/${selId}`, cuerpo);

      return peticion.pipe(
        tap((dto) => this.reemplazarCategoria(dto)),
        map(() => aviso),
      );
    }

    const cuerpo = {
      cantidad: Number(cf.cantidad),
      unidad_medida: cf.unidad,
      descripcion: cf.descripcion.trim(),
    };
    const peticion =
      selId === null
        ? this.http.post<PresentacionDto>(PRESENTACIONES, cuerpo)
        : this.http.patch<PresentacionDto>(`${PRESENTACIONES}/${selId}`, cuerpo);

    return peticion.pipe(
      tap((dto) => this.reemplazarPresentacion(dto)),
      map(() => aviso),
    );
  }

  /** Desactivar/Reactivar es lógico: si hay productos asociados el registro nunca se elimina. */
  alternarCfg(tab: CfgTab, id: number): Observable<string> {
    const etiqueta = ETIQUETA[tab];
    const reg = this.lista(tab).find((x) => x.id === id);
    if (!reg) return of('');
    const activo = reg.estado === 'Activo';
    const aviso = activo
      ? `${etiqueta} ${reg.nombre} desactivada · ya no aparece en nuevos registros y se mantiene en los productos existentes.`
      : `${etiqueta} ${reg.nombre} reactivada.`;

    if (tab === 'categorias') {
      const peticion = activo
        ? this.http.delete<CategoriaDto>(`${CATEGORIAS}/${id}`)
        : this.http.patch<CategoriaDto>(`${CATEGORIAS}/${id}/activate`, {});

      return peticion.pipe(
        tap((dto) => this.reemplazarCategoria(dto)),
        map(() => aviso),
      );
    }

    const peticion = activo
      ? this.http.delete<PresentacionDto>(`${PRESENTACIONES}/${id}`)
      : this.http.patch<PresentacionDto>(`${PRESENTACIONES}/${id}/activate`, {});

    return peticion.pipe(
      tap((dto) => this.reemplazarPresentacion(dto)),
      map(() => aviso),
    );
  }

  private reemplazarPresentacion(dto: PresentacionDto): void {
    const existentes = this.presentacionesCfg();
    const lista = existentes.some((x) => x.id === dto.id)
      ? existentes.map((x) => (x.id === dto.id ? toRegistroPresentacion(dto) : x))
      : [...existentes, toRegistroPresentacion(dto)];
    this.presentacionesCfg.set(lista);
    this.catalogo.presentacionOpciones.set(
      lista.map((p) => ({ id: p.id, nombre: p.nombre, activa: p.estado === 'Activo' })),
    );
  }

  private reemplazarCategoria(dto: CategoriaDto): void {
    const existentes = this.categoriasCfg();
    const lista = existentes.some((x) => x.id === dto.id)
      ? existentes.map((x) => (x.id === dto.id ? toRegistroCategoria(dto) : x))
      : [...existentes, toRegistroCategoria(dto)];
    this.categoriasCfg.set(lista);
    this.catalogo.categoriaOpciones.set(
      lista.map((c) => ({ id: c.id, nombre: c.nombre, activa: c.estado === 'Activo' })),
    );
  }
}
