import { Component, computed, input, output } from '@angular/core';
import { LucideEye } from '@lucide/angular';
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
import { textoUbicacion } from '../../interfaces/ubicacion.interface';

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

// Consulta de solo lectura con los datos que ya trae el listado.
// TODO: cuando el módulo de Pedidos exponga el historial por cliente (RF-A21/22),
// agregar aquí la pestaña de pedidos finalizados.
@Component({
  imports: [Badge, Button, Icon, Modal],
  selector: 'app-cliente-detalle-modal',
  templateUrl: './cliente-detalle-modal.html',
})
export class ClienteDetalleModal {
  /** null = cerrado. */
  cliente = input<Cliente | null>(null);
  closed = output<void>();

  readonly LucideEye = LucideEye;

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
}
