import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertSound } from './core/alert-sound';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {
  constructor() {
    // Created at startup so the first click unlocks alert audio.
    inject(AlertSound);
  }
}
