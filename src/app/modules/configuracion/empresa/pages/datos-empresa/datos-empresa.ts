import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Observable, finalize, of, switchMap, tap } from 'rxjs';
import { LucideUpload } from '@lucide/angular';

import { AvisoBanner } from '../../../../ventas/catalogo/components/aviso-banner/aviso-banner';
import { Breadcrumb, BreadcrumbItem } from '../../../../../shared/ds/breadcrumb/breadcrumb';
import { Button } from '../../../../../shared/ds/button/button';
import { Card } from '../../../../../shared/ds/card/card';
import { Field } from '../../../../../shared/ds/field/field';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Input } from '../../../../../shared/ds/input/input';
import { apiErrorMessage } from '../../../../../shared/utils/api-error';
import {
  EMPRESA_FORM_VACIO,
  Empresa,
  EmpresaErrores,
  EmpresaForm,
  validarEmpresa,
  validarLogo,
} from '../../interfaces/empresa.interface';
import { EmpresaService } from '../../services/empresa.service';

@Component({
  imports: [AvisoBanner, Breadcrumb, Button, Card, Field, Icon, Input],
  selector: 'app-datos-empresa',
  templateUrl: './datos-empresa.html',
})
export class DatosEmpresa implements OnInit, OnDestroy {
  private empresaService = inject(EmpresaService);

  protected readonly LucideUpload = LucideUpload;
  protected readonly migas: BreadcrumbItem[] = [
    { label: 'Configuración' },
    { label: 'Datos de empresa' },
  ];

  private selectorArchivo = viewChild<ElementRef<HTMLInputElement>>('selectorArchivo');

  cargando = signal(true);
  errorCarga = signal('');
  guardando = signal(false);
  errorGuardar = signal('');
  aviso = signal('');
  intentoGuardar = signal(false);

  /** Última versión guardada en el servidor; sirve para detectar cambios y descartar. */
  private base = signal<Empresa | null>(null);
  form = signal<EmpresaForm>({ ...EMPRESA_FORM_VACIO });

  // Logo: el que ya está guardado, el que se acaba de elegir (aún sin subir) y si se pidió quitarlo.
  logoGuardado = signal<string | null>(null);
  logoArchivo = signal<File | null>(null);
  logoPrevia = signal<string | null>(null);
  logoQuitado = signal(false);
  logoError = signal('');

  protected logoVisible = computed(() =>
    this.logoQuitado() ? null : (this.logoPrevia() ?? this.logoGuardado()),
  );

  protected errores = computed<EmpresaErrores>(() =>
    this.intentoGuardar() ? validarEmpresa(this.form()) : {},
  );

  protected hayCambios = computed(() => {
    const base = this.base();
    const form = this.form();
    const formCambio = base
      ? (Object.keys(form) as (keyof EmpresaForm)[]).some((campo) => form[campo] !== base[campo])
      : (Object.keys(form) as (keyof EmpresaForm)[]).some((campo) => form[campo] !== '');
    return formCambio || this.logoArchivo() !== null || this.logoQuitado();
  });

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.liberarPrevia();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.empresaService
      .obtener()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (empresa) => this.aplicarGuardada(empresa),
        error: (err: unknown) =>
          this.errorCarga.set(
            apiErrorMessage(err, 'No se pudieron cargar los datos de la empresa.'),
          ),
      });
  }

  cambiar(campo: keyof EmpresaForm, valor: string): void {
    this.form.update((actual) => ({ ...actual, [campo]: valor }));
    this.aviso.set('');
  }

  elegirLogo(): void {
    this.selectorArchivo()?.nativeElement.click();
  }

  alElegirArchivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    // Permite volver a elegir el mismo archivo después.
    entrada.value = '';
    if (!archivo) return;

    const error = validarLogo(archivo);
    if (error) {
      this.logoError.set(error);
      return;
    }

    this.logoError.set('');
    this.liberarPrevia();
    this.logoArchivo.set(archivo);
    this.logoPrevia.set(URL.createObjectURL(archivo));
    this.logoQuitado.set(false);
    this.aviso.set('');
  }

  quitarLogo(): void {
    this.liberarPrevia();
    this.logoArchivo.set(null);
    this.logoError.set('');
    // Solo hay que avisarle al servidor si ya había un logo guardado.
    this.logoQuitado.set(this.logoGuardado() !== null);
    this.aviso.set('');
  }

  descartar(): void {
    this.aplicarGuardada(this.base());
    this.intentoGuardar.set(false);
    this.errorGuardar.set('');
  }

  guardar(): void {
    this.intentoGuardar.set(true);
    this.errorGuardar.set('');
    if (Object.keys(validarEmpresa(this.form())).length > 0) return;

    this.guardando.set(true);
    const archivo = this.logoArchivo();
    const quitar = this.logoQuitado();

    this.empresaService
      .guardar(this.form())
      .pipe(
        // Si el logo falla después, los datos ya quedaron guardados.
        tap((empresa) => this.base.set(empresa)),
        switchMap((empresa): Observable<Empresa> => {
          if (archivo) return this.empresaService.subirLogo(archivo);
          if (quitar) return this.empresaService.quitarLogo();
          return of(empresa);
        }),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: (empresa) => {
          this.aplicarGuardada(empresa);
          this.intentoGuardar.set(false);
          this.aviso.set('Los datos de la empresa se guardaron correctamente.');
        },
        error: (err: unknown) =>
          this.errorGuardar.set(
            apiErrorMessage(err, 'No se pudieron guardar los cambios. Inténtalo nuevamente.'),
          ),
      });
  }

  private aplicarGuardada(empresa: Empresa | null): void {
    this.base.set(empresa);
    this.form.set(
      empresa
        ? {
            razonSocial: empresa.razonSocial,
            ruc: empresa.ruc,
            direccion: empresa.direccion,
            telefono: empresa.telefono,
            email: empresa.email,
          }
        : { ...EMPRESA_FORM_VACIO },
    );
    this.liberarPrevia();
    this.logoGuardado.set(empresa?.logoUrl ?? null);
    this.logoArchivo.set(null);
    this.logoQuitado.set(false);
    this.logoError.set('');
  }

  private liberarPrevia(): void {
    const previa = this.logoPrevia();
    if (previa) URL.revokeObjectURL(previa);
    this.logoPrevia.set(null);
  }
}
