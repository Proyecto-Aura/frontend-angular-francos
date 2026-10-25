import { Component, computed, inject, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { LucideEye } from '@lucide/angular';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import { Badge } from '../../../../../shared/ds/badge/badge';
import { Button } from '../../../../../shared/ds/button/button';
import { Icon } from '../../../../../shared/ds/icon/icon';
import { Modal } from '../../../../../shared/ds/modal/modal';
import {
  CATEGORIA_LABEL,
  Cliente,
  TIPO_CLIENTE_LABEL,
  TIPO_DOCUMENTO_LABEL,
  nombreCliente,
} from '../../interfaces/cliente.interface';
import { HistorialPedidos } from '../../interfaces/pedido-historial.interface';
import { textoUbicacion } from '../../interfaces/ubicacion.interface';
import { ClientePedidosService } from '../../services/cliente-pedidos.service';

const SIN_DATO = '—';

export interface CampoDetalle {
  label: string;
  value: string;
}

/** AAAA-MM-DD -> DD/MM/AAAA sin pasar por Date (evita el desfase de zona horaria). */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : SIN_DATO;
}

const INACTIVO: HistorialPedidos = { estado: 'inactivo' };
const CARGANDO: HistorialPedidos = { estado: 'cargando' };
const ERROR: HistorialPedidos = { estado: 'error' };

// Consulta de solo lectura: los datos que ya trae el listado y el historial de
// pedidos finalizados del cliente (HU-A-006).
@Component({
  imports: [Badge, Button, Icon, Modal],
  selector: 'app-cliente-detalle-modal',
  templateUrl: './cliente-detalle-modal.html',
})
export class ClienteDetalleModal {
  /** null = cerrado. */
  cliente = input<Cliente | null>(null);
  closed = output<void>();

  private pedidosService = inject(ClientePedidosService);

  readonly LucideEye = LucideEye;

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

  campos = computed<CampoDetalle[]>(() => {
    const c = this.cliente();
    if (!c) {
      return [];
    }

    const esEmpresa = c.tipoCliente === 'empresa';
    const contacto = [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ');

    return [
      { label: 'Código', value: c.codigo },
      { label: 'Tipo de persona', value: TIPO_CLIENTE_LABEL[c.tipoCliente] },
      { label: 'Tipo de cliente', value: CATEGORIA_LABEL[c.categoria] },
      { label: TIPO_DOCUMENTO_LABEL[c.tipoDocumento], value: c.numeroDocumento },
      ...(esEmpresa
        ? [
            { label: 'Razón social', value: c.razonSocial || SIN_DATO },
            { label: 'Contacto', value: contacto || SIN_DATO },
          ]
        : [
            {
              label: 'Fecha de nacimiento',
              value: c.fechaNacimiento ? formatearFecha(c.fechaNacimiento) : SIN_DATO,
            },
            { label: 'Ubicación', value: textoUbicacion(c.ubicacion) || SIN_DATO },
            { label: 'Dirección', value: c.direccion || SIN_DATO },
          ]),
      { label: 'Teléfono', value: c.telefono || SIN_DATO },
      { label: esEmpresa ? 'Correo de la empresa' : 'Correo', value: c.email || SIN_DATO },
    ];
  });

  cerrar(): void {
    this.closed.emit();
  }

  private cargarHistorial(clienteId: string): Observable<HistorialPedidos> {
    return this.pedidosService.historial(clienteId).pipe(
      map((pedidos): HistorialPedidos => ({ estado: 'listo', pedidos })),
      catchError(() => of(ERROR)),
      startWith(CARGANDO),
    );
  }
}
