import { Component } from '@angular/core';
import { HomeHeader } from '../components/home-header/home-header';
import { HomeModules } from '../components/home-modules/home-modules';
import { HomePerfil } from '../components/home-perfil/home-perfil';

@Component({
  imports: [HomeHeader, HomeModules, HomePerfil],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {}
