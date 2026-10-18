import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

const SCRIPT_CULQI = 'https://checkout.culqi.com/js/v4';

/** Lo que usa este servicio del objeto global `Culqi` del checkout v4. */
interface CulqiCheckout {
  publicKey: string;
  settings(config: { title: string; currency: string; amount: number }): void;
  options(config: Record<string, unknown>): void;
  open(): void;
  close(): void;
  token?: { id: string } | null;
  error?: { user_message?: string } | null;
}

type VentanaConCulqi = Window & { Culqi?: CulqiCheckout; culqi?: () => void };

/** Culqi se usa solo en modo de pruebas: únicamente llaves públicas pk_test_. */
export const esLlaveDePruebas = (llave: string): boolean => llave.startsWith('pk_test_');

/**
 * Abre el checkout de Culqi y entrega el token de la tarjeta o de Yape. El cobro
 * lo hace el backend con ese token (RF-A035); aquí nunca se ve la llave secreta.
 */
@Injectable({ providedIn: 'root' })
export class CulqiCheckoutService {
  private document = inject(DOCUMENT);
  private zone = inject(NgZone);
  private script: Promise<void> | null = null;

  /** Sin una llave pública de pruebas (pk_test_) el pago con Culqi no se ofrece. */
  readonly disponible = esLlaveDePruebas(environment.culqiPublicKey);

  /** Emite el token cuando el cliente completa el checkout y termina. */
  pedirToken(montoSoles: number): Observable<string> {
    return new Observable<string>((suscriptor) => {
      if (!this.disponible) {
        suscriptor.error(
          new Error('Culqi solo se usa en modo de pruebas: configura una llave pk_test_.'),
        );
        return;
      }

      this.cargarScript()
        .then(() => {
          const ventana = this.document.defaultView as VentanaConCulqi;
          const culqi = ventana.Culqi;
          if (!culqi) throw new Error('No se pudo abrir el checkout de Culqi.');

          culqi.publicKey = environment.culqiPublicKey;
          culqi.settings({
            title: "Franco's",
            currency: 'PEN',
            amount: Math.round(montoSoles * 100),
          });
          // Solo métodos que devuelven un token de cargo; los que generan una
          // orden (billeteras, banca móvil, agentes) no aplican a este flujo.
          culqi.options({
            lang: 'auto',
            installments: false,
            paymentMethods: {
              tarjeta: true,
              yape: true,
              billetera: false,
              bancaMovil: false,
              agente: false,
              cuotealo: false,
            },
          });

          // Culqi llama a esta función global al terminar, fuera de Angular.
          ventana.culqi = () =>
            this.zone.run(() => {
              if (culqi.token?.id) {
                const token = culqi.token.id;
                culqi.close();
                suscriptor.next(token);
                suscriptor.complete();
              } else {
                suscriptor.error(
                  new Error(culqi.error?.user_message ?? 'Culqi no pudo procesar el pago.'),
                );
              }
            });

          culqi.open();
        })
        .catch((error: unknown) => suscriptor.error(error));
    });
  }

  private cargarScript(): Promise<void> {
    this.script ??= new Promise<void>((resolve, reject) => {
      const etiqueta = this.document.createElement('script');
      etiqueta.src = SCRIPT_CULQI;
      etiqueta.async = true;
      etiqueta.onload = () => resolve();
      etiqueta.onerror = () => {
        this.script = null;
        reject(new Error('No se pudo cargar el checkout de Culqi. Revisa tu conexión.'));
      };
      this.document.body.appendChild(etiqueta);
    });
    return this.script;
  }
}
