import { describe, expect, it } from 'vitest';

import { documentFromQuery, documentHref, READING_INTRO, readingWords, shouldPoll, withReading } from './documentReading';

const ID = '3f1c2b9a-4d5e-4f60-8a7b-1c2d3e4f5a6b';

describe('readingWords', () => {
  it('says nothing while the switch is off', () => {
    expect(readingWords({ agent_readable: false, agent_read_status: '' })).toEqual({ text: '', tone: 'muted', readAgain: false });
    // A stale status on a switched-off document is not shown.
    expect(readingWords({ agent_readable: false, agent_read_status: 'ready' }).text).toBe('');
  });

  it('puts each status in words', () => {
    expect(readingWords({ agent_readable: true, agent_read_status: 'queued' })).toEqual({
      text: 'Reading...',
      tone: 'progress',
      readAgain: false
    });
    expect(readingWords({ agent_readable: true, agent_read_status: 'ready' })).toEqual({ text: 'Ready', tone: 'ok', readAgain: false });
    expect(readingWords({ agent_readable: true, agent_read_status: '' }).text).toBe('Reading...');
  });

  it('shows the failure sentence with Read again', () => {
    const failed = readingWords({
      agent_readable: true,
      agent_read_status: 'failed',
      agent_read_error: "This PDF is locked with a password, so Allyvia can't read it."
    });
    expect(failed).toEqual({ text: "This PDF is locked with a password, so Allyvia can't read it.", tone: 'error', readAgain: true });
    expect(readingWords({ agent_readable: true, agent_read_status: 'failed' }).text).toBe("Allyvia couldn't read this file.");
  });

  it('says an unsupported file cannot be read yet, with no Read again', () => {
    expect(readingWords({ agent_readable: true, agent_read_status: 'unsupported', agent_read_error: '' })).toEqual({
      text: "Allyvia can't read this kind of file yet.",
      tone: 'error',
      readAgain: false
    });
  });

  it('keeps the intro line plain', () => {
    expect(READING_INTRO).toBe('Allyvia only reads the documents you switch on, and only to answer your questions.');
  });
});

describe('shouldPoll', () => {
  it('polls only while a switched-on document is still being read', () => {
    expect(shouldPoll([])).toBe(false);
    expect(
      shouldPoll([
        { agent_readable: true, agent_read_status: 'ready' },
        { agent_readable: false, agent_read_status: '' }
      ])
    ).toBe(false);
    expect(
      shouldPoll([
        { agent_readable: true, agent_read_status: 'failed' },
        { agent_readable: true, agent_read_status: 'unsupported' }
      ])
    ).toBe(false);
    expect(
      shouldPoll([
        { agent_readable: true, agent_read_status: 'ready' },
        { agent_readable: true, agent_read_status: 'queued' }
      ])
    ).toBe(true);
    // A queued status left behind on a switched-off row does not keep the page polling.
    expect(shouldPoll([{ agent_readable: false, agent_read_status: 'queued' }])).toBe(false);
  });
});

describe('withReading', () => {
  it("replaces only that document's reading state", () => {
    const docs = [
      { id: 'a', name: 'Lease', agent_readable: false, agent_read_status: '', agent_read_error: '' },
      { id: 'b', name: 'Policy', agent_readable: true, agent_read_status: 'ready', agent_read_error: '' }
    ];
    const next = withReading(docs, { id: 'a', agent_readable: true, agent_read_status: 'queued', agent_read_error: '' });
    expect(next[0]).toEqual({ id: 'a', name: 'Lease', agent_readable: true, agent_read_status: 'queued', agent_read_error: '' });
    expect(next[1]).toBe(docs[1]);
  });
});

describe('documentHref', () => {
  it('opens the Drive link when there is one, else the Documents page at that document', () => {
    expect(documentHref(ID, 'https://docs.google.com/document/d/abc/edit')).toBe('https://docs.google.com/document/d/abc/edit');
    expect(documentHref(ID, null)).toBe(`/documents?document=${ID}`);
    expect(documentHref(ID, '')).toBe(`/documents?document=${ID}`);
    // Never a script or a plain-http link.
    expect(documentHref(ID, 'javascript:alert(1)')).toBe(`/documents?document=${ID}`);
    expect(documentHref(ID, 'http://example.test/x')).toBe(`/documents?document=${ID}`);
  });

  it('reads the document back off the Documents URL', () => {
    expect(documentFromQuery(`?document=${ID}`)).toBe(ID);
    expect(documentFromQuery('?document=../etc')).toBeNull();
    expect(documentFromQuery('')).toBeNull();
  });
});
