// Owner trust T12: "Allyvia can read this", the per-document switch on the Documents page.
// Pure: the words for each reading state, when the list should refresh, and where a document opens.

export type ReadStatus = '' | 'queued' | 'ready' | 'failed' | 'unsupported';

export interface ReadingState {
  agent_readable?: boolean;
  agent_read_status?: ReadStatus | string | null;
  agent_read_error?: string | null;
}

/** The line at the top of the Documents page. */
export const READING_INTRO = 'Allyvia only reads the documents you switch on, and only to answer your questions.';
export const SWITCH_LABEL = 'Allyvia can read this';
export const READ_AGAIN = 'Read again';
/** While any document is queued, the list is fetched again this often. */
export const POLL_MS = 4000;

const FALLBACK_FAILED = "Allyvia couldn't read this file.";
const FALLBACK_UNSUPPORTED = "Allyvia can't read this kind of file yet.";

export interface ReadingWords {
  /** What the owner reads beside the switch; empty when the switch is off. */
  text: string;
  tone: 'muted' | 'progress' | 'ok' | 'error';
  /** Offer "Read again" (a failure she can retry). */
  readAgain: boolean;
}

/** The words beside the switch for one document. */
export const readingWords = (doc: ReadingState): ReadingWords => {
  if (!doc.agent_readable) return { text: '', tone: 'muted', readAgain: false };
  switch (doc.agent_read_status) {
    case 'queued':
      return { text: 'Reading...', tone: 'progress', readAgain: false };
    case 'ready':
      return { text: 'Ready', tone: 'ok', readAgain: false };
    case 'unsupported':
      return { text: doc.agent_read_error || FALLBACK_UNSUPPORTED, tone: 'error', readAgain: false };
    case 'failed':
      return { text: doc.agent_read_error || FALLBACK_FAILED, tone: 'error', readAgain: true };
    default:
      // Switched on but not yet queued (an older row): reading has not started.
      return { text: 'Reading...', tone: 'progress', readAgain: false };
  }
};

/** Whether the list should keep refreshing: only while a switched-on document is still being read. */
export const shouldPoll = (docs: readonly ReadingState[]): boolean =>
  docs.some((doc) => !!doc.agent_readable && (doc.agent_read_status === 'queued' || !doc.agent_read_status));

/** The document with its new reading state, after the switch or "Read again" answered. */
export const withReading = <T extends ReadingState & { id: string }>(docs: readonly T[], state: ReadingState & { id: string }): T[] =>
  docs.map((doc) =>
    doc.id === state.id
      ? {
          ...doc,
          agent_readable: state.agent_readable,
          agent_read_status: state.agent_read_status,
          agent_read_error: state.agent_read_error
        }
      : doc
  );

/** The page a document opens on: its Drive link when it has one, else the Documents page at that document. */
export const documentHref = (id: string, driveUrl?: string | null): string => {
  if (driveUrl && /^https:\/\/[^\s]+$/i.test(driveUrl)) return driveUrl;
  return `/documents?document=${encodeURIComponent(id)}`;
};

/** The document a Documents URL points at (`?document=<id>`), or null. */
export const documentFromQuery = (search: string): string | null => {
  const value = new URLSearchParams(search).get('document');
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
};
