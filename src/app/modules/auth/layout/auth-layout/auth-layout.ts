import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthHome } from '../../components/auth-home/auth-home';

@Component({
  imports: [RouterOutlet, AuthHome],
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.html',
})
export class AuthLayout {}
