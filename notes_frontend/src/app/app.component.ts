import { Component } from '@angular/core';
import { NotesPageComponent } from './notes/notes-page.component';

@Component({
  selector: 'app-root',
  imports: [NotesPageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {}
