import { describe, expect, it } from 'vitest';

import { pinIcon } from './pinIcon';

describe('pinIcon', () => {
  it('beats the global phone rule that sets every svg to width: 100% !important', () => {
    expect(pinIcon(16)).toEqual({
      '& svg': { width: '16px !important', maxWidth: 'none !important', height: '16px', flex: 'none' }
    });
  });
});
