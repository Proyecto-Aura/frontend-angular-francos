import { Component } from '@angular/core';
import { HomeModules } from '../components/home-modules/home-modules';
import { HomePerfil } from '../components/home-perfil/home-perfil';

@Component({
  imports: [HomeModules,HomePerfil],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {}
