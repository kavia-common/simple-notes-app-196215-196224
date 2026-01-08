export interface Note {
  /** Backend-generated unique id. */
  id: string;
  /** User-facing title (displayed in sidebar list). */
  title: string;
  /** Main note content. */
  content: string;
  /** Optional timestamps if backend provides them. */
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Notes list item shown in the sidebar (title-only).
 * If backend only returns full notes, we can still map to this.
 */
export interface NoteListItem {
  id: string;
  title: string;
}
