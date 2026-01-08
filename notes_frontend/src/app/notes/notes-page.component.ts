import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import type { Note, NoteListItem } from './note.model';
import { NotesService } from './notes.service';

type ViewState = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notes-page.component.html',
  styleUrl: './notes-page.component.css',
})
export class NotesPageComponent implements OnInit {
  notes: NoteListItem[] = [];
  selectedId: string | null = null;

  listState: ViewState = 'idle';
  detailState: ViewState = 'idle';

  listError: string | null = null;
  detailError: string | null = null;

  isDirty = false;

  readonly form;

  constructor(
    private readonly fb: FormBuilder,
    private readonly notesService: NotesService,
  ) {
    this.form = this.fb.nonNullable.group({
      title: this.fb.nonNullable.control('', {
        validators: [Validators.maxLength(120)],
      }),
      content: this.fb.nonNullable.control(''),
    });
  }

  ngOnInit(): void {
    this.refreshList();

    // Track dirty state to show "Unsaved changes"
    this.form.valueChanges.subscribe(() => {
      this.isDirty = true;
    });
  }

  trackById = (_: number, item: NoteListItem) => item.id;

  refreshList(): void {
    this.listState = 'loading';
    this.listError = null;

    this.notesService
      .listNotes()
      .pipe(
        finalize(() => {
          if (this.listState !== 'error') this.listState = 'idle';
        }),
      )
      .subscribe({
        next: (items) => {
          this.notes = items;
          // Keep selection if possible, otherwise select first note.
          if (this.selectedId && items.some((n) => n.id === this.selectedId)) {
            return;
          }
          if (items.length > 0) {
            this.select(items[0].id);
          } else {
            this.selectedId = null;
            this.form.reset({ title: '', content: '' });
            this.isDirty = false;
          }
        },
        error: (err: unknown) => {
          this.listState = 'error';
          this.listError = err instanceof Error ? err.message : String(err);
        },
      });
  }

  select(id: string): void {
    // If switching while dirty, keep it simple: no modal—just switch and lose unsaved changes.
    this.selectedId = id;
    this.loadSelected();
  }

  loadSelected(): void {
    if (!this.selectedId) return;

    this.detailState = 'loading';
    this.detailError = null;

    this.notesService
      .getNote(this.selectedId)
      .pipe(
        finalize(() => {
          if (this.detailState !== 'error') this.detailState = 'idle';
        }),
      )
      .subscribe({
        next: (note: Note) => {
          this.form.setValue({
            title: note.title ?? '',
            content: note.content ?? '',
          });
          this.isDirty = false;
        },
        error: (err: unknown) => {
          this.detailState = 'error';
          this.detailError = err instanceof Error ? err.message : String(err);
        },
      });
  }

  createNew(): void {
    this.detailError = null;
    this.detailState = 'loading';

    this.notesService
      .createNote({ title: 'Untitled', content: '' })
      .pipe(
        finalize(() => {
          if (this.detailState !== 'error') this.detailState = 'idle';
        }),
      )
      .subscribe({
        next: (created) => {
          // Optimistically update list then select new note
          this.notes = [{ id: created.id, title: created.title }, ...this.notes];
          this.selectedId = created.id;
          this.form.setValue({
            title: created.title ?? '',
            content: created.content ?? '',
          });
          this.isDirty = false;
        },
        error: (err: unknown) => {
          this.detailState = 'error';
          this.detailError = err instanceof Error ? err.message : String(err);
        },
      });
  }

  save(): void {
    if (!this.selectedId) return;

    const title = this.form.controls.title.value?.trim() ?? '';
    const content = this.form.controls.content.value ?? '';

    this.detailError = null;
    this.detailState = 'loading';

    this.notesService
      .updateNote(this.selectedId, { title: title || 'Untitled', content })
      .pipe(
        finalize(() => {
          if (this.detailState !== 'error') this.detailState = 'idle';
        }),
      )
      .subscribe({
        next: (updated) => {
          // Update title in the sidebar list
          this.notes = this.notes.map((n) =>
            n.id === updated.id ? { id: updated.id, title: updated.title } : n,
          );
          this.isDirty = false;
        },
        error: (err: unknown) => {
          this.detailState = 'error';
          this.detailError = err instanceof Error ? err.message : String(err);
        },
      });
  }

  deleteSelected(): void {
    if (!this.selectedId) return;

    const id = this.selectedId;

    this.detailError = null;
    this.detailState = 'loading';

    this.notesService
      .deleteNote(id)
      .pipe(
        finalize(() => {
          if (this.detailState !== 'error') this.detailState = 'idle';
        }),
      )
      .subscribe({
        next: () => {
          const remaining = this.notes.filter((n) => n.id !== id);
          this.notes = remaining;

          if (remaining.length > 0) {
            this.select(remaining[0].id);
          } else {
            this.selectedId = null;
            this.form.reset({ title: '', content: '' });
            this.isDirty = false;
          }
        },
        error: (err: unknown) => {
          this.detailState = 'error';
          this.detailError = err instanceof Error ? err.message : String(err);
        },
      });
  }
}
