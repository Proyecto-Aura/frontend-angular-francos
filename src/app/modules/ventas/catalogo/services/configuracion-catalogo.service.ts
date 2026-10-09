import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CategoriaDto } from '../interfaces/producto-dto.interface';
import { CfgFormModel, CfgTab, RegistroCfg } from '../interfaces/producto.interface';
import { toOpcionCategoria } from '../mappers/producto.mapper';
import { CatalogoService } from './catalogo.service';

const CATEGORIAS = `${environment.apiUrl}/categorias`;

const toRegistroCategoria = (dto: CategoriaDto): RegistroCfg => ({
  id: dto.id,
  nombre: dto.nombre,
  descripcion: dto.descripcion ?? '',
  estado: dto.estado ? 'Activo' : 'Inactivo',
});

// Configuración del catálogo (categorías y presentaciones).
// Categorías (HU-040) ya usa la API; las presentaciones (HU-041) siguen con datos de ejemplo.
// TODO(backend): conectar presentaciones cuando se aborde la HU-041.
const MOCK_PRESENTACIONES: RegistroCfg[] = [
  { id: 1, nombre: 'Bolsa 100 g', descripcion: 'Bolsa sellada de 100 gramos.', estado: 'Activo' },
  { id: 2, nombre: 'Bolsa 120 g', descripcion: 'Bolsa sellada de 120 gramos.', estado: 'Activo' },
  { id: 3, nombre: 'Bolsa 150 g', descripcion: 'Bolsa sellada de 150 gramos.', estado: 'Activo' },
  { id: 4, nombre: 'Bolsa 180 g', descripcion: 'Bolsa sellada de 180 gramos.', estado: 'Activo' },
  { id: 5, nombre: 'Bolsa 200 g', descripcion: 'Bolsa sellada de 200 gramos.', estado: 'Activo' },
  { id: 6, nombre: 'Pack x6', descripcion: 'Pack de 6 bolsas.', estado: 'Activo' },
  { id: 7, nombre: 'Pack x12', descripcion: 'Pack de 12 bolsas.', estado: 'Activo' },
  {
    id: 8,
    nombre: 'Display x24',
    descripcion: 'Display de exhibición de 24 unidades.',
    estado: 'Inactivo',
  },
];

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
  presentacionesCfg = signal<RegistroCfg[]>(MOCK_PRESENTACIONES);

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
    if (!cf.nombre) e.push('nombre');
    if (!cf.descripcion) e.push('descripción');
    const dup = this.lista(tab).some(
      (x) => x.nombre.toLowerCase() === cf.nombre.toLowerCase() && x.id !== selId,
    );
    if (dup) e.push('el nombre ya está registrado');
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

  private aplicarCategorias(categorias: CategoriaDto[]): void {
    this.categoriasCfg.set(categorias.map(toRegistroCategoria));
    this.catalogo.categoriaOpciones.set(categorias.map(toOpcionCategoria));
  }

  /** Alta (selId = null) o edición. Emite el aviso; en categorías, error si la API rechaza. */
  guardarCfg(tab: CfgTab, selId: number | null, cf: CfgFormModel): Observable<string> {
    const etiqueta = ETIQUETA[tab];
    const aviso =
      selId === null
        ? `${etiqueta} ${cf.nombre.trim()} registrada · disponible en los selectores de producto.`
        : `${etiqueta} ${cf.nombre.trim()} actualizada.`;

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

    this.presentacionesCfg.update((l) =>
      selId === null
        ? [
            ...l,
            {
              id: Math.max(0, ...l.map((x) => x.id)) + 1,
              nombre: cf.nombre,
              descripcion: cf.descripcion,
              estado: 'Activo',
            },
          ]
        : l.map((x) =>
            x.id === selId ? { ...x, nombre: cf.nombre, descripcion: cf.descripcion } : x,
          ),
    );
    return of(aviso);
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

    const nuevo = activo ? 'Inactivo' : 'Activo';
    this.presentacionesCfg.update((l) => l.map((x) => (x.id === id ? { ...x, estado: nuevo } : x)));
    return of(aviso);
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
