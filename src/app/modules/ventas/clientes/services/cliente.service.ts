import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  ActualizarClienteRequestDto,
  ClienteDto,
  ClientesPageDto,
  RegistrarClienteRequestDto,
  RegistroClienteResponseDto,
} from '../interfaces/cliente-dto.interface';
import {
  CategoriaCliente,
  Cliente,
  ClienteForm,
  ClienteRegistrado,
  ClientesPagina,
  TipoCliente,
} from '../interfaces/cliente.interface';
import {
  toActualizarClienteRequest,
  toCliente,
  toClienteRegistrado,
  toClientesPagina,
  toRegistrarClienteRequest,
} from '../mappers/cliente.mapper';

const CLIENTES_BASE = `${environment.apiUrl}/clientes`;
// El alta de clientes por staff vive en el módulo de auth del backend.
const REGISTRO_CLIENTE_URL = `${environment.apiUrl}/auth/register/cliente`;

export interface FiltrosClientes {
  /** Busca en razón social, nombres, apellidos y número de documento. */
  search?: string;
  // El DTO del backend solo acepta el booleano literal (estado=true/false).
  estado?: boolean;
  tipoCliente?: TipoCliente;
  categoria?: CategoriaCliente;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private http = inject(HttpClient);

  listar(pagina = 1, limite = 8, filtros: FiltrosClientes = {}): Observable<ClientesPagina> {
    const params: Record<string, string | number | boolean> = { page: pagina, limit: limite };
    if (filtros.search) params['search'] = filtros.search;
    if (filtros.estado !== undefined) params['estado'] = filtros.estado;
    if (filtros.tipoCliente) params['tipo_cliente'] = filtros.tipoCliente;
    if (filtros.categoria) params['categoria_cliente'] = filtros.categoria;

    return this.http.get<ClientesPageDto>(CLIENTES_BASE, { params }).pipe(map(toClientesPagina));
  }

  registrar(form: ClienteForm): Observable<ClienteRegistrado> {
    const body: RegistrarClienteRequestDto = toRegistrarClienteRequest(form);
    return this.http
      .post<RegistroClienteResponseDto>(REGISTRO_CLIENTE_URL, body)
      .pipe(map(toClienteRegistrado));
  }

  actualizar(id: string, form: ClienteForm): Observable<Cliente> {
    const body: ActualizarClienteRequestDto = toActualizarClienteRequest(form);
    return this.http.patch<ClienteDto>(`${CLIENTES_BASE}/${id}`, body).pipe(map(toCliente));
  }

  /** Desactivación lógica: el cliente se conserva en el historial. */
  desactivar(id: string): Observable<Cliente> {
    return this.http.delete<ClienteDto>(`${CLIENTES_BASE}/${id}`).pipe(map(toCliente));
  }

  activar(id: string): Observable<Cliente> {
    return this.http
      .patch<ClienteDto>(`${CLIENTES_BASE}/${id}/activate`, null)
      .pipe(map(toCliente));
  }
}
