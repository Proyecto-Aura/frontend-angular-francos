import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { SelectOption } from '../select/select';

export type FieldSize = 'sm' | 'md' | 'lg';

const HEIGHTS: Record<FieldSize, string> = { sm: '36px', md: '44px', lg: '48px' };

// Select con buscador: mismo contrato que app-ds-select (value/options como
// SelectOption[]) para poder reemplazarlo 1 a 1, pero el input de texto
// filtra la lista en vivo en vez de depender del <select> nativo.
//
// El panel de opciones se abre con el CDK Overlay (portal a document.body +
// posicionamiento "conectado" al input) en vez de un <ul> con position:
// absolute dentro del propio template: eso ultimo queda recortado por
// cualquier ancestro con overflow (una tabla con scroll horizontal, el
// contenido scrolleable del modal), porque sigue siendo descendiente del
// DOM de esos contenedores aunque este absolutamente posicionado.
@Component({
  imports: [],
  selector: 'app-ds-combobox',
  templateUrl: './combobox.html',
})
export class Combobox {
  value = model('');
  options = input<SelectOption[]>([]);
  placeholder = input<string | null>(null);
  emptyMessage = input('Sin resultados.');
  invalid = input(false);
  disabled = input(false);
  size = input<FieldSize>('md');
  id = input<string | null>(null);
  name = input<string | null>(null);

  private overlay = inject(Overlay);
  private viewContainerRef = inject(ViewContainerRef);

  @ViewChild('trigger') private triggerRef!: ElementRef<HTMLElement>;
  @ViewChild('panel') private panelTemplate!: TemplateRef<unknown>;

  private overlayRef: OverlayRef | null = null;

  open = signal(false);
  filterText = signal('');
  highlightIndex = signal(-1);
  focused = signal(false);

  height = computed(() => HEIGHTS[this.size()]);
  listboxId = computed(() => (this.id() ? `${this.id()}-listbox` : null));

  selectedLabel = computed(
    () => this.options().find((opt) => opt.value === this.value())?.label ?? '',
  );

  // Cerrado: muestra la opcion elegida. Abierto: muestra lo que la persona
  // esta tipeando para filtrar (aunque todavia no haya elegido nada nuevo).
  displayText = computed(() => (this.open() ? this.filterText() : this.selectedLabel()));

  filteredOptions = computed(() => {
    const query = this.filterText().trim().toLocaleLowerCase('es');
    if (!query) return this.options();
    return this.options().filter((opt) => opt.label.toLocaleLowerCase('es').includes(query));
  });

  shellClasses = computed(() => {
    const invalid = this.invalid();
    const focused = this.focused();
    const disabled = this.disabled();
    return [
      'w-full box-border font-sans text-ds-base outline-none transition-[border-color,box-shadow,background] duration-[120ms] ease-linear rounded-field pl-[14px] pr-[38px]',
      disabled
        ? 'bg-muted text-muted-foreground cursor-not-allowed'
        : invalid
          ? 'bg-[rgba(210,43,43,0.04)] text-foreground'
          : 'bg-input-background text-foreground',
      invalid
        ? 'border border-destructive'
        : focused
          ? 'border border-primary'
          : 'border border-border',
      focused ? 'shadow-[var(--shadow-focus)]' : 'shadow-ds-field',
    ].join(' ');
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.overlayRef?.dispose());
  }

  // Mismo patron que dropdown-menu.ts: un click afuera cierra. El panel
  // ahora vive en un overlay fuera del host (ver arriba), asi que tambien
  // cuenta como "adentro" si el click cae dentro de el. Las opciones de la
  // lista usan (mousedown)="$event.preventDefault()" para no perder el foco
  // del input al elegir, asi que un click en una opcion nunca llega a
  // disparar este handler como "afuera".
  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(event: MouseEvent): void {
    const target = event.target as Node;
    const dentroDelTrigger = this.triggerRef?.nativeElement.contains(target) ?? false;
    const dentroDelPanel = this.overlayRef?.overlayElement.contains(target) ?? false;
    if (!dentroDelTrigger && !dentroDelPanel) {
      this.cerrar();
    }
  }

  abrir(): void {
    if (this.disabled()) return;
    this.open.set(true);
    this.filterText.set('');
    this.highlightIndex.set(-1);
    this.abrirPanel();
  }

  cerrar(): void {
    this.open.set(false);
    this.filterText.set('');
    this.highlightIndex.set(-1);
    this.overlayRef?.detach();
  }

  onInput(event: Event): void {
    this.filterText.set((event.target as HTMLInputElement).value);
    this.highlightIndex.set(-1);
  }

  seleccionar(option: SelectOption): void {
    this.value.set(option.value);
    this.cerrar();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cerrar();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.open()) {
        this.abrir();
        return;
      }
      const total = this.filteredOptions().length;
      if (total === 0) return;
      this.highlightIndex.update((i) => (i + 1) % total);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const total = this.filteredOptions().length;
      if (total === 0) return;
      this.highlightIndex.update((i) => (i <= 0 ? total - 1 : i - 1));
      return;
    }

    if (event.key === 'Enter') {
      const opciones = this.filteredOptions();
      const indice = this.highlightIndex();
      if (this.open() && indice >= 0 && indice < opciones.length) {
        event.preventDefault();
        this.seleccionar(opciones[indice]);
      }
    }
  }

  private abrirPanel(): void {
    const ancho = this.triggerRef.nativeElement.getBoundingClientRect().width;

    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        positionStrategy: this.overlay
          .position()
          .flexibleConnectedTo(this.triggerRef)
          .withPositions([
            { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
            {
              originX: 'start',
              originY: 'top',
              overlayX: 'start',
              overlayY: 'bottom',
              offsetY: -4,
            },
          ])
          .withFlexibleDimensions(false)
          .withPush(false),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        width: ancho,
      });
    } else {
      this.overlayRef.updateSize({ width: ancho });
    }

    if (!this.overlayRef.hasAttached()) {
      this.overlayRef.attach(new TemplatePortal(this.panelTemplate, this.viewContainerRef));
    }
  }
}
