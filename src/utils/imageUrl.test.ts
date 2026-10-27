import { describe, expect, it } from 'vitest';

import { absoluteImageUrl, photoErrorDetail } from './imageUrl';

describe('absoluteImageUrl', () => {
  const path = '/api/v1/inventory/images/abc/0123456789ab-card.webp';
  it('prefixes a path-absolute URL with the API origin, not the API path', () => {
    expect(absoluteImageUrl(path, 'https://api.allyvia.co/api/v1')).toBe('https://api.allyvia.co' + path);
    expect(absoluteImageUrl(path, 'http://localhost:8000/api/v1/')).toBe('http://localhost:8000' + path);
  });
  it('leaves an absolute URL (a CDN base) alone', () => {
    expect(absoluteImageUrl('https://cdn.example' + path, 'https://api.allyvia.co/api/v1')).toBe('https://cdn.example' + path);
  });
  it('returns null for no photo', () => {
    expect(absoluteImageUrl(null, 'https://api.allyvia.co')).toBeNull();
    expect(absoluteImageUrl('', 'https://api.allyvia.co')).toBeNull();
  });
  it('falls back to the path when no base is known', () => {
    expect(absoluteImageUrl(path, undefined)).toBe(path);
  });
});

describe('photoErrorDetail', () => {
  it('reads the server sentence and ignores everything else', () => {
    expect(photoErrorDetail({ code: 'too_large', detail: 'That file is 30,000,000 bytes; the limit is 20,971,520.' })).toMatch(/limit/);
    expect(photoErrorDetail({ file: ['A photo file is required.'] })).toBeNull();
    expect(photoErrorDetail('nope')).toBeNull();
  });
});
