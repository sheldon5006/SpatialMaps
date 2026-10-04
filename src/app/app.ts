import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SpatialMap } from './spatial-map/spatial-map';

@Component({
  imports: [RouterOutlet, SpatialMap],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
