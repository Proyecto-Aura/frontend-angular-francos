import { Injectable, signal } from '@angular/core';
import { Cliente, ClienteFormModel, generarUsuario } from '../interfaces/cliente.interface';

// TODO(backend): reemplazar MOCK_CLIENTES y los métodos de abajo por HttpClient
// contra /api/ventas/clientes cuando exista el endpoint — mismo patrón
// dto -> mapper -> interfaz que usa AuthService. Los datos de aquí son los
// mismos 7 clientes de ejemplo que trae el diseño original, para que la UI
// se vea igual mientras no hay backend real.
const MOCK_CLIENTES: Cliente[] = [
  { codigo: 'CLI-000001', tipoDoc: 'RUC', doc: '20548712345', persona: 'empresa', razon: 'Distribuidora Andes S.A.C.', nombres: '', apellidos: '', nacimiento: '', departamento: '', provincia: '', distrito: '', direccion: '', cNombres: 'Rosa Elena', cPaterno: 'Quispe', cMaterno: 'Huamán', cCorreo: 'rquispe@gmail.com', tipo: 'Mayorista', telefono: '987654321', correo: 'compras@andes.com.pe', estado: 'Activo', usuario: 'andes.20548712345', password: 'Fr2026-4821', verificado: true },
  { codigo: 'CLI-000002', tipoDoc: 'RUC', doc: '20601188472', persona: 'empresa', razon: 'Comercial Sur E.I.R.L.', nombres: '', apellidos: '', nacimiento: '', departamento: '', provincia: '', distrito: '', direccion: '', cNombres: 'Jorge Luis', cPaterno: 'Medina', cMaterno: 'Salas', cCorreo: 'jorge.medina.s@gmail.com', tipo: 'Mayorista', telefono: '956120744', correo: 'jmedina@comsur.pe', estado: 'Activo', usuario: 'comsur.20601188472', password: 'Fr2026-7734', verificado: true },
  { codigo: 'CLI-000003', tipoDoc: 'DNI', doc: '45288977', persona: 'natural', razon: '', cNombres: '', cPaterno: '', cMaterno: '', cCorreo: '', nombres: 'Ana María', apellidos: 'Vega Torres', nacimiento: '1989-04-17', departamento: 'Lima', provincia: 'Lima', distrito: 'Surco', direccion: 'Jr. Las Magnolias 312', tipo: 'Minorista', telefono: '944208877', correo: 'vega.mini@gmail.com', estado: 'Activo', usuario: 'avega.45288977', password: 'Fr2026-1190', verificado: false },
  { codigo: 'CLI-000004', tipoDoc: 'RUC', doc: '10512477903', persona: 'natural', razon: '', cNombres: '', cPaterno: '', cMaterno: '', cCorreo: '', nombres: 'Luis', apellidos: 'Ccahua Rojas', nacimiento: '1982-11-03', departamento: 'Piura', provincia: 'Piura', distrito: 'Castilla', direccion: 'Av. Grau 1045', tipo: 'Minorista', telefono: '912477903', correo: 'bodegasunidas@outlook.com', estado: 'Activo', usuario: 'lccahua.10512477903', password: 'Fr2026-5508', verificado: true },
  { codigo: 'CLI-000005', tipoDoc: 'RUC', doc: '20553901188', persona: 'empresa', razon: 'Hotel Costa Verde S.A.', nombres: '', apellidos: '', nacimiento: '', departamento: '', provincia: '', distrito: '', direccion: '', cNombres: 'Patricia', cPaterno: 'Arana', cMaterno: 'Villanueva', cCorreo: 'parana@outlook.com', tipo: 'Mayorista', telefono: '013901188', correo: 'abastecimiento@costaverde.pe', estado: 'Activo', usuario: 'costaverde.20553901188', password: 'Fr2026-3362', verificado: true },
  { codigo: 'CLI-000006', tipoDoc: 'CE', doc: '001948220', persona: 'natural', razon: '', cNombres: '', cPaterno: '', cMaterno: '', cCorreo: '', nombres: 'Diego', apellidos: 'Luján Ferrer', nacimiento: '1994-06-22', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', direccion: 'Calle Berlín 480', tipo: 'Minorista', telefono: '919482201', correo: 'hola@cafelujan.pe', estado: 'Inactivo', usuario: 'dlujan.001948220', password: 'Fr2026-6017', verificado: false },
  { codigo: 'CLI-000007', tipoDoc: 'Pasaporte', doc: 'PE4471208', persona: 'natural', razon: '', cNombres: '', cPaterno: '', cMaterno: '', cCorreo: '', nombres: 'Marta', apellidos: 'Iglesias Soto', nacimiento: '1991-01-09', departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Yanahuara', direccion: 'Av. Ejército 702', tipo: 'Minorista', telefono: '933471208', correo: 'marta.iglesias@mail.com', estado: 'Activo', usuario: 'miglesias.pe4471208', password: 'Fr2026-2845', verificado: false },
];

@Injectable({ providedIn: 'root' })
export class ClienteService {
  clientes = signal<Cliente[]>(MOCK_CLIENTES);

  registrar(f: ClienteFormModel): Cliente {
    const codigo = 'CLI-' + String(this.clientes().length + 1).padStart(6, '0');
    const nuevo: Cliente = { ...f, codigo, usuario: generarUsuario(f), estado: 'Activo', verificado: true };
    this.clientes.update(list => [...list, nuevo]);
    return nuevo;
  }

  actualizar(codigo: string, f: ClienteFormModel): void {
    this.clientes.update(list => list.map(c => (c.codigo === codigo ? { ...c, ...f } : c)));
  }

  /** "Eliminar" es lógico: alterna Activo/Inactivo sin borrar el registro (así lo define el diseño real). */
  alternarEstado(codigo: string): void {
    this.clientes.update(list =>
      list.map(c => (c.codigo === codigo ? { ...c, estado: c.estado === 'Activo' ? 'Inactivo' : 'Activo' } : c)),
    );
  }
}