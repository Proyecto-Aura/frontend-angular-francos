import { DestroyRef, inject, signal } from '@angular/core';
import { AlertTone } from './alert';

export interface AlertaTemporal {
  tone: AlertTone;
  title: string;
  description?: string;
}

/** Crea avisos de 4,5 segundos y cancela el temporizador al destruir la vista. */
export function crearAlertaTemporal(alCerrar?: () => void) {
  const destroyRef = inject(DestroyRef);
  const toast = signal<AlertaTemporal | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;
  function limpiar(): void {
    if (timer) clearTimeout(timer);
    timer = null;
    toast.set(null);
    alCerrar?.();
  }
  function mostrar(tone: AlertTone, title: string, description?: string): void {
    limpiar();
    toast.set({ tone, title, description });
    timer = setTimeout(limpiar, 4500);
  }
  destroyRef.onDestroy(limpiar);
  return { toast: toast.asReadonly(), mostrar, limpiar };
}
