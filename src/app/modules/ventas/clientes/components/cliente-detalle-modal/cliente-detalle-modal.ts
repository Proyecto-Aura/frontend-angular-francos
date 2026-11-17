import { Component, computed, inject, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { LucideEye, LucidePencil } from '@lucide/angular';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import {
  CATEGORIA_LABEL,
  Cliente,
  TIPO_DOCUMENTO_LABEL,
  nombreCliente,
} from '../../interfaces/cliente.interface';
import { HistorialPedidos } from '../../interfaces/pedido-historial.interface';
import { ClientePedidosService } from '../../services/cliente-pedidos.service';

const SIN_DATO = '—';

export interface CampoDetalle {
  label: string;
  value: string;
}

const INACTIVO: HistorialPedidos = { estado: 'inactivo' };
const CARGANDO: HistorialPedidos = { estado: 'cargando' };
const ERROR: HistorialPedidos = { estado: 'error' };

// Consulta de solo lectura: el resumen del cliente, los datos del contacto (empresas)
// y el historial de pedidos finalizados (HU-A-006). Desde aquí se puede pedir editarlo.
@Component({
  imports: [Badge, Button, Icon, Modal],
  selector: 'app-cliente-detalle-modal',
  templateUrl: './cliente-detalle-modal.html',
})
export class ClienteDetalleModal {
  /** null = cerrado. */
  cliente = input<Cliente | null>(null);
  closed = output<void>();
  /** Pide a la página abrir el formulario de edición del cliente mostrado. */
  editarCliente = output<Cliente>();

  private pedidosService = inject(ClientePedidosService);

  readonly LucideEye = LucideEye;
  readonly LucidePencil = LucidePencil;

  /** Se vuelve a consultar cada vez que cambia el cliente mostrado. */
  private historial = toSignal(
    toObservable(this.cliente).pipe(
      switchMap((cliente) => (cliente ? this.cargarHistorial(cliente.id) : of(INACTIVO))),
    ),
    { initialValue: INACTIVO },
  );

  cargandoPedidos = computed(() => this.historial().estado === 'cargando');
  errorPedidos = computed(() => this.historial().estado === 'error');
  pedidos = computed(() => {
    const historial = this.historial();
    return historial.estado === 'listo' ? historial.pedidos : [];
  });

  titulo = computed(() => {
    const cliente = this.cliente();
    return cliente ? nombreCliente(cliente) : '';
  });

  esEmpresa = computed(() => this.cliente()?.tipoCliente === 'empresa');

  /** Nombre y apellidos de la persona (en una empresa, la persona de contacto). */
  nombrePersona = computed(() => {
    const c = this.cliente();
    return c ? [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ') : '';
  });

  /** Datos del panel de resumen, en el orden del prototipo. */
  resumen = computed<CampoDetalle[]>(() => {
    const c = this.cliente();
    if (!c) {
      return [];
    }

    return [
      {
        label: 'Documento',
        value: `${TIPO_DOCUMENTO_LABEL[c.tipoDocumento]} ${c.numeroDocumento}`,
      },
      this.esEmpresa()
        ? { label: 'Razón social', value: c.razonSocial || SIN_DATO }
        : { label: 'Nombre completo', value: this.nombrePersona() || SIN_DATO },
      { label: 'Tipo de cliente', value: CATEGORIA_LABEL[c.categoria] },
      { label: 'Teléfono', value: c.telefono || SIN_DATO },
      // En una empresa el único correo es el del contacto: se muestra en su sección.
      ...(this.esEmpresa() ? [] : [{ label: 'Correo', value: c.email || SIN_DATO }]),
      ...(c.usuario ? [{ label: 'Usuario', value: c.usuario }] : []),
      ...(c.correoVerificado === undefined
        ? []
        : [{ label: 'Verificación', value: c.correoVerificado ? 'Verificado' : 'Correo enviado' }]),
    ];
  });

  /** El panel se dibuja en dos filas: las cuatro primeras y el resto. */
  filaPrincipal = computed(() => this.resumen().slice(0, 4));
  filaSecundaria = computed(() => this.resumen().slice(4));

  nombreContacto = computed(() => this.nombrePersona() || SIN_DATO);

  /** Campos de la sección "Datos del contacto" (solo empresas). */
  camposContacto = computed<CampoDetalle[]>(() => {
    const c = this.cliente();
    if (!c) {
      return [];
    }

    return [
      { label: 'Nombre del contacto', value: this.nombreContacto() },
      { label: 'Correo del contacto', value: c.email || SIN_DATO },
    ];
  });

  cerrar(): void {
    this.closed.emit();
  }

  editar(): void {
    const cliente = this.cliente();
    if (cliente) {
      this.editarCliente.emit(cliente);
    }
  }

  private cargarHistorial(clienteId: string): Observable<HistorialPedidos> {
    return this.pedidosService.historial(clienteId).pipe(
      map((pedidos): HistorialPedidos => ({ estado: 'listo', pedidos })),
      catchError(() => of(ERROR)),
      startWith(CARGANDO),
    );
  }
}
