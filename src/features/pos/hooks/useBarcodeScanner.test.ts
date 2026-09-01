import { describe, expect, it } from 'vitest';
import { scannerCommit, shouldIgnoreTarget } from './scannerHeuristics';

const sequence = (value: string, gap: number) => [...value].map((key, i) => ({ key, at: i * gap })).concat({ key: 'Enter', at: value.length * gap });

describe('scanner timing heuristic', () => {
  it('commits scanner-speed input', () => expect(scannerCommit(sequence('ABC123', 8))).toBe('ABC123'));
  it('discards human-speed input', () => expect(scannerCommit(sequence('ABC123', 80))).toBeNull());
  it('requires at least four characters', () => expect(scannerCommit(sequence('ABC', 8))).toBeNull());
  it('ignores discount/text inputs', () => expect(shouldIgnoreTarget({ tagName: 'INPUT', getAttribute: () => null })).toBe(true));
  it('allows the dedicated scan field', () => expect(shouldIgnoreTarget({ tagName: 'INPUT', getAttribute: () => 'true' })).toBe(false));
});
