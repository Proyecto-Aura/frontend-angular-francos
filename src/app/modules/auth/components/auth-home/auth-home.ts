import { Component } from '@angular/core';

interface Feature {
  icon: string;
  text: string;
}

@Component({
  imports: [],
  selector: 'auth-home',
  templateUrl: './auth-home.html',
  host: { class: 'contents' },
})
export class AuthHome {
  protected readonly features: Feature[] = [
    { icon: '/icons/feature-security.svg', text: 'Acceso seguro y encriptado' },
    { icon: '/icons/feature-panel.svg', text: 'Panel de productos' },
    { icon: '/icons/feature-support.svg', text: 'Atencion Personalizada' },
  ];
}
