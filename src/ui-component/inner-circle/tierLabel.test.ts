import { describe, expect, it } from 'vitest';

import { isHexColor, tierChipStyle, tierLabel } from './tierLabel';

const rung = (name: string, color = '') => ({ id: 'l1', name, rank: 1, color, icon: '' });

describe('tierLabel', () => {
  it('shows the rung a ladder boutique named', () => {
    // THE bug: the merchant configures Bronze/Silver/Gold and their own
    // customers list shows Vault/Regular/Shopper — the names are visible to
    // their customers and not to them.
    expect(tierLabel('regular', rung('Silver'))).toBe('Silver');
  });

  it('distinguishes two middle rungs that share one legacy slug', () => {
    // Both are "regular"; only the rung tells them apart.
    expect(tierLabel('regular', rung('Silver'))).not.toBe(tierLabel('regular', rung('Gold')));
  });

  it('falls back to the legacy label when there is no ladder', () => {
    expect(tierLabel('vault')).toBe('Vault');
    expect(tierLabel('regular')).toBe('Regular');
    expect(tierLabel('shopper')).toBe('Shopper');
  });

  it('passes an unrecognised server string through rather than losing it', () => {
    expect(tierLabel('platinum')).toBe('platinum');
  });

  it('returns null only for nothing at all', () => {
    expect(tierLabel(null)).toBeNull();
    expect(tierLabel('')).toBeNull();
    expect(tierLabel(undefined)).toBeNull();
    expect(tierLabel(null, rung('  '))).toBeNull();
  });

  it('never throws on an unknown slug', () => {
    // The version this replaces indexed a three-key record with a server
    // string, so any unrecognised tier was an exception — and an exception
    // here unmounts the table it was rendering.
    expect(() => tierLabel('not-a-tier')).not.toThrow();
    expect(() => tierLabel('vault', null)).not.toThrow();
  });
});

describe('tierChipStyle', () => {
  it('refuses a colour MUI cannot decompose', () => {
    // TierLevel.color has NO validator anywhere — model or serializer — so a
    // merchant typing "gold" gets it stored verbatim. Passing that to
    // getContrastText throws and takes the customers table down.
    expect(isHexColor('gold')).toBe(false);
    expect(isHexColor('#GGGGGG')).toBe(false);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('#A1B2C3')).toBe(true);

    expect(tierChipStyle('regular', rung('Gold', 'gold'))).toEqual({ kind: 'palette', color: 'primary' });
  });

  it('uses a merchant hex when it is usable', () => {
    expect(tierChipStyle('regular', rung('Obsidian', '#101010'))).toEqual({ kind: 'custom', hex: '#101010' });
  });

  it('keeps the legacy palette for a legacy tier', () => {
    expect(tierChipStyle('vault')).toEqual({ kind: 'palette', color: 'warning' });
    expect(tierChipStyle('shopper')).toEqual({ kind: 'palette', color: 'default' });
  });

  it('is muted when there is nothing to show', () => {
    expect(tierChipStyle(null)).toEqual({ kind: 'muted' });
  });
});
