/** How far through the series the reader is. Shared by every page that hides spoilers. */
export type Book = 1 | 2 | 3;

export const BOOK_NAMES: Record<Book, string> = { 1: 'Book I', 2: 'Book II', 3: 'Book III' };

const BOOK_KEY = 'scribe-archive:book';

export function parseBook(value: unknown): Book {
  const n = Number(value);
  return n === 2 || n === 3 ? n : 1;
}

/** Starts at Book I, the safest place for a new reader. */
export function loadBook(): Book {
  try {
    return parseBook(localStorage.getItem(BOOK_KEY));
  } catch {
    return 1;
  }
}

export function saveBook(book: Book): void {
  try {
    localStorage.setItem(BOOK_KEY, String(book));
  } catch {
    // The shield still applies for this visit.
  }
}
