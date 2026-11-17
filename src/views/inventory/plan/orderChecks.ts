// Owner trust T8: the vendor rules a plan does not meet, as the order endcap says them.
//
// The sentences are the server's (the same ones the memo's caveats carry): nothing is worded or counted here. A
// group with no checks, a check with no sentence and a repeated sentence are left out. A check never hides or
// disables "Create draft POs": it is said, the order is hers.

import type { OrderPreview } from 'api/buying.api';

export interface VendorCheckGroup {
  supplierId: string;
  supplier: string;
  sentences: string[];
}

export const vendorChecks = (preview: OrderPreview | null | undefined): VendorCheckGroup[] => {
  const out: VendorCheckGroup[] = [];
  (preview?.groups || []).forEach((group) => {
    const sentences: string[] = [];
    (Array.isArray(group.checks) ? group.checks : []).forEach((check) => {
      const sentence = typeof check?.sentence === 'string' ? check.sentence.trim() : '';
      if (sentence && !sentences.includes(sentence)) sentences.push(sentence);
    });
    if (sentences.length) out.push({ supplierId: group.supplier_id, supplier: group.supplier, sentences });
  });
  return out;
};
