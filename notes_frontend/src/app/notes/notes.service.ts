import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { getApiBaseUrl, getFeatureFlags } from '../core/env';
import type { Note, NoteListItem } from './note.model';

type CreateNotePayload = {
  title: string;
  content: string;
};

type UpdateNotePayload = {
  title: string;
  content: string;
};

function toMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const status = err.status ? `${err.status} ` : '';
    const msg =
      typeof err.error === 'string'
        ? err.error
        : err.message || 'Request failed';
    return `${status}${msg}`.trim();
  }
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

/**
 * Clone helper for mock notes to avoid leaking references.
 * Uses JSON cloning which is sufficient for our plain-data Note objects.
 */
function cloneNote<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * In-memory mock store used when feature flag mockData=true AND backend is unavailable
 * (or to allow a demo without backend).
 */
const MOCK_NOTES: Note[] = [
  {
    id: 'mock-1',
    title: 'Welcome to Simple Notes',
    content:
      'This is mock data.\n\nSet NG_APP_FEATURE_FLAGS=mockData=false to disable it.\nConfigure NG_APP_API_BASE or NG_APP_BACKEND_URL to connect to the backend.',
  },
  {
    id: 'mock-2',
    title: 'Tips',
    content:
      '• Use the sidebar to create/select notes\n• Edit title & content in the main panel\n• Click Save to persist\n• Delete removes the selected note',
  },
];

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly apiBase = getApiBaseUrl();
  private readonly flags = getFeatureFlags();

  constructor(private readonly http: HttpClient) {}

  private url(path: string): string {
    // If apiBase is empty => relative path for same-origin.
    return `${this.apiBase}${path}`;
  }

  private useMock(): boolean {
    return this.flags.mockData === true;
  }

  private listMock(): Observable<NoteListItem[]> {
    return of(MOCK_NOTES.map((n) => ({ id: n.id, title: n.title })));
  }

  private getMock(id: string): Observable<Note> {
    const found = MOCK_NOTES.find((n) => n.id === id);
    if (!found) return throwError(() => new Error('Note not found (mock)'));
    return of(cloneNote(found));
  }

  private createMock(payload: CreateNotePayload): Observable<Note> {
    const now = new Date().toISOString();
    const note: Note = {
      id: `mock-${Math.random().toString(16).slice(2)}`,
      title: payload.title || 'Untitled',
      content: payload.content || '',
      createdAt: now,
      updatedAt: now,
    };
    MOCK_NOTES.unshift(note);
    return of(cloneNote(note));
  }

  private updateMock(id: string, payload: UpdateNotePayload): Observable<Note> {
    const idx = MOCK_NOTES.findIndex((n) => n.id === id);
    if (idx < 0) return throwError(() => new Error('Note not found (mock)'));
    MOCK_NOTES[idx] = {
      ...MOCK_NOTES[idx],
      title: payload.title,
      content: payload.content,
      updatedAt: new Date().toISOString(),
    };
    return of(cloneNote(MOCK_NOTES[idx]));
  }

  private deleteMock(id: string): Observable<void> {
    const idx = MOCK_NOTES.findIndex((n) => n.id === id);
    if (idx >= 0) MOCK_NOTES.splice(idx, 1);
    return of(void 0);
  }

  // PUBLIC_INTERFACE
  listNotes(): Observable<NoteListItem[]> {
    return this.http.get<unknown>(this.url('/notes')).pipe(
      map((res) => {
        // Accept either: NoteListItem[] or Note[] from backend.
        if (Array.isArray(res)) {
          return res
            .map((item) => {
              const obj: Record<string, unknown> =
                item && typeof item === 'object'
                  ? (item as Record<string, unknown>)
                  : {};
              return {
                id: String(obj['id'] ?? ''),
                title: String(obj['title'] ?? ''),
              } satisfies NoteListItem;
            })
            .filter((n) => n.id);
        }
        return [];
      }),
      catchError((err) => {
        if (this.useMock()) return this.listMock();
        return throwError(() => new Error(toMessage(err)));
      }),
    );
  }

  // PUBLIC_INTERFACE
  getNote(id: string): Observable<Note> {
    return this.http.get<Note>(this.url(`/notes/${encodeURIComponent(id)}`)).pipe(
      catchError((err) => {
        if (this.useMock()) return this.getMock(id);
        return throwError(() => new Error(toMessage(err)));
      }),
    );
  }

  // PUBLIC_INTERFACE
  createNote(payload: CreateNotePayload): Observable<Note> {
    return this.http.post<Note>(this.url('/notes'), payload).pipe(
      catchError((err) => {
        if (this.useMock()) return this.createMock(payload);
        return throwError(() => new Error(toMessage(err)));
      }),
    );
  }

  // PUBLIC_INTERFACE
  updateNote(id: string, payload: UpdateNotePayload): Observable<Note> {
    return this.http
      .put<Note>(this.url(`/notes/${encodeURIComponent(id)}`), payload)
      .pipe(
        catchError((err) => {
          if (this.useMock()) return this.updateMock(id, payload);
          return throwError(() => new Error(toMessage(err)));
        }),
      );
  }

  // PUBLIC_INTERFACE
  deleteNote(id: string): Observable<void> {
    return this.http
      .delete<void>(this.url(`/notes/${encodeURIComponent(id)}`))
      .pipe(
        catchError((err) => {
          if (this.useMock()) return this.deleteMock(id);
          return throwError(() => new Error(toMessage(err)));
        }),
      );
  }
}
